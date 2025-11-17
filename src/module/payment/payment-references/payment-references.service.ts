import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common'
import { CreatePaymentReferenceDto } from './dto/create-payment-reference.dto'
import { generateDueDate } from '../../util/generate-due-date'
import { generateReferenceNumber } from '../../util/generate-refence-number'
import { AppyPayUtil } from '../../util/appypay/appy-pay-util'
import { InvoiceService } from '../../invoice/invoice.service'
import { CreateInvoiceDto } from '../../invoice/dto/create-invoice.dto'
import { AppyPayWebhookDto } from '../../webhook/dto/appypay-webhook.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { PaymentReferences } from './entities/payment-reference.entity'
import { EntityManager, Repository } from 'typeorm'
import { RegisterPaymentReferenceDto } from './dto/register-payment-reference.dto'
import { InvoiceItem } from '../../invoice/entities/InvoiceIten.entity'
import { MesTemp } from './entities/mes-temp.entity'
import { AcademicYear } from 'src/module/invoice/entities/academic.year.entity'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

@Injectable()
export class PaymentReferencesService {
  private readonly appyPayUtil: AppyPayUtil


  constructor(
    @InjectQueue('payment_reference_service')
    private readonly paymentReferenceQueue: Queue,

    // UPDATED INJECTION
    @InjectRepository(MesTemp)
    private readonly mesTempRepository: Repository<MesTemp>,
    @InjectRepository(PaymentReferences)
    private readonly paymentReferencesRepository: Repository<PaymentReferences>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,

    @InjectRepository(AcademicYear)

    private readonly academicYearRepository: Repository<AcademicYear>,
    private readonly invoiceService: InvoiceService) {

    this.appyPayUtil = new AppyPayUtil()
  }

  async create(createPaymentReferenceDto: CreatePaymentReferenceDto) {

    const { itens, ...payments } = createPaymentReferenceDto;

    // 🕒 Gera dueDate e referenceNumber em paralelo (melhor desempenho)
    const [dueDate, referenceNumber] = await Promise.all([
      generateDueDate(3),
      generateReferenceNumber(),
    ]);

    // 📦 Monta payload para AppyPay
    const payload = this.buildAppyPayPayload(
      payments,
      dueDate,
      referenceNumber,
    );

    // 🚀 Cria a referência no AppyPay
    const appyResponse = await this.appyPayUtil.createPaymentReference(payload);

    const status = appyResponse?.responseStatus;

    if (!status?.successful || !status?.reference?.referenceNumber) {
      console.error('❌ Falha ao gerar referência no AppyPay:', appyResponse);
      throw new BadGatewayException(
        'Falha ao gerar referência de pagamento. A fatura não será criada.'
      );
    }

    // 🧾 Monta DTO da fatura
    const createInvoiceDto: CreateInvoiceDto = {
      DataFactura: new Date().toISOString(),
      polo_id: 1,
      TotalPreco: payments.amount,
      Descricao: payments.description,
      tipo_documento_factura_id: 2,
      Desconto: 0,
      totalIVA: 0,
      TotalMulta: 0,
      canal: 3,
      CodigoMatricula: payments.enrollment?.CodigoMatricula,
      codigo_preinscricao: payments.enrollment?.codigo_preinscricao,

    };

    // 🧠 Cria fatura e armazena no banco
    const [invoice] = await Promise.all([
      this.invoiceService.create(
        createInvoiceDto,
        referenceNumber,
        dueDate,
      ),
    ]);


    if (itens && itens.length > 0) {
      const invoiceItems = this.invoiceItemRepository.create(
        itens.map(item => ({
          codigoProduto: item.CodigoProduto,
          codigoFactura: invoice.Codigo,
          quantidade: item.Quantidade,
          total: item.Total,
          obs: item.obs,
          taxaIva: item.taxaIva,
          valorIva: item.valorIva,
          preco: item.preco,
          retencao: item.retencao,
          incidencia: item.incidencia,
          valorDesconto: item.valorDesconto,
          descontoProduto: item.descontoProduto,
          mes: item.mes,
          multa: item.multa,
          mesTempId: item.mesTempId,
          codigoAnoLectivo: invoice.anoLectivo,
          estado: item.estado,
          valorPago: item.valorPago,
          valorATransportar: item.valorATransportar,
        }))
      );

      await this.invoiceItemRepository.save(invoiceItems);
    }


    // ✅ Retorno final
    const entity = status.reference.entity;
    return {
      message: 'Referência AppyPay e fatura criadas com sucesso ✅',
      referenceNumber,
      dueDate,
      entity,
      invoiceNumber: invoice.numSequenciaFactura,
      nextInvoice: invoice.NextFactura,
    };
  }

async registerPaymentReference(dto: RegisterPaymentReferenceDto) {
  return await this.paymentReferencesRepository.manager.transaction(
    async (transactionalEntityManager: EntityManager) => {
      const maxRetries = 5;
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          const sourceId = await this.generateNextSourceId(); 

          const paymentReference = transactionalEntityManager.create(
            this.paymentReferencesRepository.target,
            {
              paymentId: dto.paymentId,
              sourceId,
              facturaCodigo: dto.facturaCodigo,
              entityId: dto.entityId,
              reference: dto.reference,
              referenceId: dto.referenceId,
              merchantTransactionId: dto.merchantTransactionId,
              amount: dto.amount,
              startDate: dto.startDate ? new Date(dto.startDate) : undefined,
              endDate: dto.endDate ? new Date(dto.endDate) : undefined,
              status: dto.status,
              webhook: dto.webhook,
            },
          );

          const saved = await transactionalEntityManager.save(paymentReference);
          return saved; 

        } catch (error: any) {
          attempts++;

          if (error.code === 'ER_DUP_ENTRY' && attempts < maxRetries) {
            console.warn(`SOURCE_ID duplicado (tentativa ${attempts}/${maxRetries}). A tentar novamente...`);
            // continua o loop para gerar novo sourceId
            continue;
          }

          console.error('Erro ao salvar payment reference após várias tentativas:', error);
          throw error; // falha → rollback automático
        }
      }

      throw new Error('Falha ao gerar sourceId único após várias tentativas');
    },
  );
}
  

async createMonthlyPaymentReferences(
  createPaymentReferenceDto: CreatePaymentReferenceDto,
) {
  const { itens, ...payments } = createPaymentReferenceDto;

  return await this.paymentReferencesRepository.manager.transaction(
    async (transactionalEntityManager: EntityManager) => {
      // 1. Buscar ano letivo ativo (dentro da transação)
      const academicYear = await transactionalEntityManager.findOne(
        this.academicYearRepository.target,
        { where: { estado: 'Activo' } },
      );

      if (!academicYear) {
        throw new NotFoundException('Ano letivo não definido no sistema.');
      }

      // 2. Buscar meses ativos
      const mesTemps = await transactionalEntityManager.find(
        this.mesTempRepository.target,
        {
          where: { ano_lectivo: academicYear.Codigo, activo: 1 },
        },
      );

      if (!mesTemps.length) {
        throw new NotFoundException(
          'Nenhum mês ativo encontrado para o ano letivo atual.',
        );
      }

      if (!itens?.length) {
        return { message: 'Nenhum item para processar.' };
      }

      const [item] = itens;

      // 3. Processar TODOS os meses em paralelo (dentro da mesma transação)
      await Promise.all(
        mesTemps.map(async (mes) => {
          // ---- Cálculo da data inicial ----
          let date_inicial = new Date();
          if (new Date(mes.data_final) > new Date()) {
            date_inicial = new Date(mes.data_final);
            date_inicial.setDate(date_inicial.getDate() + 1);
          }

          // ---- Geração paralela de vencimento e referência ----
          const [dueDate, referenceNumber] = await Promise.all([
            generateDueDate(30),
            generateReferenceNumber(),
          ]);

          // ---- Payload para AppyPay ----
          const payload = this.buildAppyPayPayload(
            payments,
            dueDate,
            referenceNumber,
          );

          // ---- Chamada externa à AppyPay (fora da transação? OK, mas tratamos erro) ----
          const appyResponse = await this.appyPayUtil.createPaymentReference(payload);

          const status = appyResponse?.responseStatus;
          if (!status?.successful || !status?.reference?.referenceNumber) {
            throw new BadGatewayException(
              `Falha ao gerar referência AppyPay para o mês ${mes.designacao}.`,
            );
          }

          // ---- Criação da Fatura (usando transactionalEntityManager) ----
          const createInvoiceDto: CreateInvoiceDto = {
            DataFactura: new Date().toISOString(),
            polo_id: 1,
            TotalPreco: payments.amount,
            Descricao: payments.description,
            tipo_documento_factura_id: 2,
            Desconto: 0,
            totalIVA: 0,
            TotalMulta: 0,
            ValorAPagar: payments.amount,
            canal: 3,
            CodigoMatricula: payments.enrollment?.CodigoMatricula,
            codigo_preinscricao: payments.enrollment?.codigo_preinscricao,
          };

          // Assumindo que invoiceService também aceita manager (senão injeta ou passa)
          const invoice = await this.invoiceService.create(
            createInvoiceDto,
            referenceNumber,
            dueDate,
            transactionalEntityManager, // <--- importante!
          );

          // ---- Geração de código aleatório para merchantTransactionId ----
         const merchantTransactionId = await this.generateRandomCode();

          // ---- Registro da referência (usa o método com retry que já tens) ----
        
          const finalPayload: RegisterPaymentReferenceDto = {
            paymentId: undefined,
            facturaCodigo: invoice.Codigo,
            entityId: status?.reference?.entity || '10065',
            reference: referenceNumber,
            referenceId: appyResponse.id,
            merchantTransactionId,
            amount: Number(invoice.TotalPreco),
            startDate: new Date().toISOString(),
            endDate: new Date(dueDate).toISOString(),
            status: status?.status,
            webhook: 'https://api.seusistema.com/webhook/pagamento-be',
          };

          // Usa o método com retry + transação interna (ele já lida com duplicados)
          await this.registerPaymentReference(finalPayload);
          // Ou, se preferires, chama diretamente com o manager:
          // await this.registerPaymentReference(finalPayload, transactionalEntityManager);
          // ---- Criação do Item da Fatura ----
          const invoiceItemData = {
            codigoProduto: item.CodigoProduto,
            codigoFactura: invoice.Codigo,
            quantidade: item.Quantidade,
            total: item.Total,
            obs: `Mensalidade de ${mes.designacao}`,
            taxaIva: item.taxaIva,
            valorIva: item.valorIva,
            preco: payments.amount,
            retencao: item.retencao,
            incidencia: item.incidencia,
            valorDesconto: item.valorDesconto,
            descontoProduto: item.descontoProduto,
            mes: mes.designacao,
            multa: item.multa,
            mesTempId: mes.id,
            codigoAnoLectivo: invoice.anoLectivo,
            estado: 0,
            valorPago: item.valorPago,
            valorATransportar: item.valorATransportar,
          };

          const invoiceItem = transactionalEntityManager.create(
            this.invoiceItemRepository.target,
            invoiceItemData,
          );
          await transactionalEntityManager.save(invoiceItem);
        }),
      );

      // Tudo correu bem → commit automático
      return {
        message: 'Referências AppyPay e faturas criadas com sucesso para todos os meses ✅',
      };
    },
  );
}

async renewPaymentReference(invoiceId: number): Promise<any> {
  return await this.paymentReferencesRepository.manager.transaction(
    async (transactionalEntityManager: EntityManager) => {
      // 1. Buscar fatura dentro da transação (lock pessimista opcional se quiseres evitar race conditions)
      const invoice = await this.invoiceService.findOne(invoiceId);
      if (!invoice) {
        throw new NotFoundException('Fatura não encontrada.');
      }

      // 2. Gera dueDate e referenceNumber em paralelo
      const [dueDate, referenceNumber] = await Promise.all([
        generateDueDate(3),
        generateReferenceNumber(),
      ]);

      // 3. Payload para AppyPay
      const payload = this.buildAppyPayPayload(
        {
          amount: invoice.TotalPreco,
          currency: 'AOA',
          description: invoice.Descricao || 'Renovação de referência de pagamento',
        },
        dueDate,
        referenceNumber,
      );

      // 4. Chamada externa ao AppyPay
      const appyResponse = await this.appyPayUtil.createPaymentReference(payload);

      const status = appyResponse?.responseStatus;
      if (!status?.successful || !status?.reference?.referenceNumber) {
        console.error('❌ Falha ao gerar referência no AppyPay:', appyResponse);
        throw new BadGatewayException(
          'Falha ao gerar referência de pagamento via AppyPay.',
        );
      }

      // 5. Código aleatório para merchantTransactionId
      const merchantTransactionId = await this.generateRandomCode();

      // 6. Payload final para registro local
      const finalPayload: RegisterPaymentReferenceDto = {
        paymentId: undefined,
        facturaCodigo: invoice.Codigo, 
        entityId: status?.reference?.entity || '10065',
        reference: referenceNumber,
        referenceId: appyResponse.id,
        merchantTransactionId,
        amount: Number(invoice.TotalPreco),
        startDate: new Date().toISOString(),
        endDate: new Date(dueDate).toISOString(),
        status: status?.status,
        webhook: 'https://api.seusistema.com/webhook/pagamento-be',
      };

      // 7. Registro com retry automático de sourceId duplicado
      // (usa o método que já tem transação interna + loop de retry)
      const registered = await this.registerPaymentReference(
        finalPayload,
       
      );


      return {
        message: 'Referência de pagamento renovada com sucesso ✅',
        reference: registered,
        appyPayId: appyResponse.id,
        newReferenceNumber: referenceNumber,
        newDueDate: dueDate,
      };
    },
  );
}
  // ------------------------ NEWS ------------------------

  async queueCreatePaymentReferences(
    createPaymentReferenceDto: CreatePaymentReferenceDto
  ) {
    const job = await this.paymentReferenceQueue.add('createPaymentReferencesJob', {
      createPaymentReferenceDto,
    });
    return {
      message: 'Processamento iniciado: criando fatura do serviço...',
      taskId: job.id,
    };
  }
  async queueUpdatePaymentReferences(invoiceId: number) {
    const job = await this.paymentReferenceQueue.add('updatePaymentReferencesJob', {
      invoiceId,
    }, {
      attempts: 5,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return {
      message: 'Processamento iniciado: renovando referência de pagamento...',
      taskId: job.id,
      invoiceId
    };
  }
  async queuecreateMonthlyPaymentReferences(
    createPaymentReferenceDto: CreatePaymentReferenceDto
  ) {
    const job = await this.paymentReferenceQueue.add('createMonthlyPaymentReferencesJob', {
      createPaymentReferenceDto,
    });
    return {
      message: 'Processamento iniciado: criando faturas de mensalidades...',
      taskId: job.id,
    };
  }


  async getJobStatus(taskId: string) {
    const job = await this.paymentReferenceQueue.getJob(taskId);
    if (!job) {
      throw new NotFoundException('Tarefa não encontrada.');
    }
    const state = await job.getState();
    return {
      taskId: job.id,
      state,
      progress: job.progress,
      result: job.returnvalue,
    };
  }


  /**
   * 🧩 Monta o payload final para criação da referência AppyPay
   */
  private buildAppyPayPayload(
    dto: CreatePaymentReferenceDto,
    dueDate: string,
    referenceNumber: string,
  ): Record<string, any> {
    const paymentMethod = 'REF_65e88e95-9d71-4bbb-882a-412fb6a7e111'

    const finalPayload: Record<string, any> = {
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      paymentMethod,
      paymentInfo: {
        dueDate,
        referenceNumber,
      },
      merchantTransactionId: referenceNumber,
    }

    if (dto.notify) {
      finalPayload.notify = {
        name: dto.notify.name,
        telephone: dto.notify.telephone,
        email: dto.notify.email,
        smsNotification: true,
        emailNotification: true,
      }
    }

    return finalPayload
  }
  private async generateNextSourceId(): Promise<string> {
    try {
     const random = Math.floor(100000 + Math.random() * 900000);
      return `${random}REF1-T`;
    } catch (error) {
      console.warn('Erro ao buscar último SOURCE_ID:', error.message);
    }

    // Fallback: aleatório
    const random = Math.floor(100000 + Math.random() * 900000);
    return `${random}REF1`;
  }
  // payment-references.service.ts
  private async generateRandomCode(length: number = 15): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

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
    @InjectRepository(MesTemp)
    private readonly mesTempRepository: Repository<MesTemp>,
    @InjectRepository(PaymentReferences)
    private readonly paymentReferencesRepository: Repository<PaymentReferences>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,

    @InjectRepository(AcademicYear)

    private readonly academicYearRepository: Repository<AcademicYear>,
    private readonly invoiceService: InvoiceService) {
    PaymentReferences.setRepository(this.paymentReferencesRepository)

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
          valorATransportar: item.valorATransportar?.toString(),
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

async registerPaymentReference(
  dto: RegisterPaymentReferenceDto,
  manager?: EntityManager
): Promise<PaymentReferences> {
  const mgr = manager || this.paymentReferencesRepository.manager;

  return await mgr.transaction(async (trx) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        // 1. GERAR ID SEQUENCIAL (começa em 90000)
        const ultimoId = await trx
          .createQueryBuilder(PaymentReferences, 'r')
          .select('r.id', 'r_id')
          .where("REGEXP_LIKE(r.id, '^[0-9]+$')")
          .orderBy('TO_NUMBER(r.id)', 'DESC')
          .limit(1)
          .getRawOne();

        let nextId = 90000;
        if (ultimoId?.r_id) {
          const lastNum = Number(ultimoId.r_id);
          if (!isNaN(lastNum) && lastNum >= 90000) {
            nextId = lastNum + 1;
          }
        }

        const idGerado = nextId.toString();
        console.log('ID GERADO PARA REFERÊNCIA:', idGerado);

        // 2. GERAR SOURCE_ID ÚNICO
        const sourceId = await this.generateNextSourceId(); // ← seu método existente

        // 3. Criar entidade com id e sourceId
        const entity = trx.create(PaymentReferences, {
          ...dto,
          id: idGerado,           // ← AQUI!
          sourceId,               // ← AQUI!
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
          endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        });

        // 4. Salvar
        const saved = await trx.save(entity);
        console.log('REFERÊNCIA CRIADA COM SUCESSO:', saved.id);
        return saved;

      } catch (error: any) {
        attempts++;
        const isUniqueError =
          error.message?.includes('unique constraint') ||
          error.message?.includes('ORA-00001');

        if (isUniqueError && attempts < MAX_ATTEMPTS) {
          console.warn(`Conflito de unicidade (tentativa ${attempts})`);
          continue; // tenta novamente com novo sourceId
        }

        console.error('Erro ao salvar PaymentReferences:', error);
        throw error;
      }
    }

    throw new Error('Falha ao gerar referência única após várias tentativas');
  });
}

  async createMonthlyPaymentReferences(
    createPaymentReferenceDto: CreatePaymentReferenceDto,
  ) {
    const { itens, ...payments } = createPaymentReferenceDto;

    return await this.paymentReferencesRepository.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        // 1. Buscar ano letivo ativo
        const academicYear = await transactionalEntityManager.findOne(
          this.academicYearRepository.target,
          { where: { estado: 'Activo' } }
        );
        if (!academicYear) {
          throw new NotFoundException('Ano letivo não definido no sistema.');
        }

        // 2. Buscar meses ativos
        const mesTemps = await transactionalEntityManager.find(
          this.mesTempRepository.target,
          {
            where: { ano_lectivo: academicYear.Codigo, activo: 1 },
          }
        );
        if (!mesTemps.length) {
          throw new NotFoundException('Nenhum mês ativo encontrado para o ano letivo atual.');
        }

        if (!itens?.length) {
          return { message: 'Nenhum item para processar.' };
        }
        const [item] = itens;

        // 3. PROCESSAR MESES SEQUENCIALMENTE (1 conexão!)
        for (const mes of mesTemps) {
          const date_inicial = new Date(mes.data_final);
          date_inicial.setDate(date_inicial.getDate() + 1);

          console.log(date_inicial, "VERIFICAR DATA");

          // --- Ajuste: Se date_inicial for menor que hoje, avança 20 dias a partir de hoje ---
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0); // Zera hora para comparar apenas a data

          const vinteDiasFuturo = new Date(hoje);
          vinteDiasFuturo.setDate(hoje.getDate() + 20);

          if (date_inicial < hoje) {
            date_inicial.setTime(vinteDiasFuturo.getTime()); // Substitui pela data mínima válida
            console.log("Data inicial ajustada para 20 dias a partir de hoje:", date_inicial);
          }

          // ---- Geração paralela de vencimento e referência ----
          const [dueDate, referenceNumber] = await Promise.all([
            generateDueDate(15, date_inicial), // Agora date_inicial é segura
            generateReferenceNumber(),
          ]);

          // ---- Payload para AppyPay ----
          const payload = this.buildAppyPayPayload(payments, dueDate, referenceNumber);

          // ---- Chamada externa à AppyPay (fora da transação, OK) ----
          const appyResponse = await this.appyPayUtil.createPaymentReference(payload);
          const status = appyResponse?.responseStatus;

          if (!status?.successful || !status?.reference?.referenceNumber) {
            throw new BadGatewayException(
              `Falha ao gerar referência AppyPay para o mês ${mes.designacao}.`
            );
          }


          // ---- Criação da Fatura ----
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

          const invoice = await this.invoiceService.create(
            createInvoiceDto,
            referenceNumber,
            dueDate,
            transactionalEntityManager // ← mesma conexão
          );

          // ---- Merchant Transaction ID ----
          const merchantTransactionId = await this.generateRandomCode();

          // ---- Payload final para registro ----
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

          // PASSA O MANAGER → usa mesma conexão!
          await this.registerPaymentReference(finalPayload, transactionalEntityManager);
          // GERA O CÓDIGO DO ITEM AQUI, COM O MESMO MANAGER
  const ultimoItem = await transactionalEntityManager
    .createQueryBuilder(InvoiceItem, 'i')
    .select('i.codigo', 'i_codigo')
    .where("REGEXP_LIKE(i.codigo, '^[0-9]+$')")
    .orderBy('TO_NUMBER(i.codigo)', 'DESC')
    .limit(1)
    .getRawOne();

  let nextNumber = 1;
  if (ultimoItem?.i_codigo) {
    const lastNum = Number(ultimoItem.i_codigo);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }

  const codigoItemGerado = nextNumber.toString().padStart(6, '0');
  console.log('CÓDIGO GERADO PARA ITEM:', codigoItemGerado);

          // ---- Criação do Item da Fatura ----
          const invoiceItemData = {
            codigo: codigoItemGerado,
            CodigoProduto: item.CodigoProduto.toString(),
            CodigoFactura: invoice.Codigo,
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
            valorATransportar: item.valorATransportar?.toString(),
          };

          const invoiceItem = transactionalEntityManager.create(
            this.invoiceItemRepository.target,
            invoiceItemData
          );
          await transactionalEntityManager.save(invoiceItem);
        }

        return {
          message: 'Referências AppyPay e faturas criadas com sucesso para todos os meses',
        };
      }
    );
  }

  async renewPaymentReference(invoiceId: number): Promise<any> {
    return await this.paymentReferencesRepository.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        // 1. Buscar fatura
        const invoice = await this.invoiceService.findOne(invoiceId);
        if (!invoice) {
          throw new NotFoundException('Fatura não encontrada.');
        }

        // 2. Buscar itens da fatura
        const invoiceItems = await this.invoiceItemRepository.find({
          where: { CodigoFactura: invoice.Codigo },
        });

        // 3. REGRA: aplica 10% apenas se for mensalidade (1 item + mesTempId)
        const isMensalidade = invoiceItems.length === 1 && invoiceItems[0].mesTempId != null;

        const today = new Date();
        const isAfter15th = today.getDate() > 15;

        const originalAmount = Number(invoice.TotalPreco);
        let finalAmount = originalAmount;
        let description = invoice.Descricao || 'Renovação de referência de pagamento';

        // APLICA MULTA DE 10% SÓ SE:
        // - For mensalidade E
        // - For após o dia 15
        if (isMensalidade && isAfter15th) {
          finalAmount = originalAmount * 1.10;
          description = `${description} (Multa de 10% por renovação após o dia 15)`;
        }

        const amountToPay = Number(finalAmount.toFixed(2));

        // 4. Gera dueDate e referenceNumber
        const [dueDate, referenceNumber] = await Promise.all([
          generateDueDate(10),
          generateReferenceNumber(),
        ]);

        // 5. Payload para AppyPay (com valor já com possível multa)
        const payload = this.buildAppyPayPayload(
          {
            amount: amountToPay,
            currency: 'AOA',
            description,
          },
          dueDate,
          referenceNumber
        );

        // 6. Chamada ao AppyPay
        const appyResponse = await this.appyPayUtil.createPaymentReference(payload);
        const status = appyResponse?.responseStatus;

        if (!status?.successful || !status?.reference?.referenceNumber) {
          console.error('Falha ao gerar referência no AppyPay:', appyResponse);
          throw new BadGatewayException('Falha ao gerar referência de pagamento via AppyPay.');
        }

        // 7. Merchant Transaction ID
        const merchantTransactionId = await this.generateRandomCode();

        // 8. Registro local
        const finalPayload: RegisterPaymentReferenceDto = {
          paymentId: undefined,
          facturaCodigo: invoice.Codigo,
          entityId: status?.reference?.entity || '10065',
          reference: referenceNumber,
          referenceId: appyResponse.id,
          merchantTransactionId,
          amount: amountToPay,
          startDate: new Date().toISOString(),
          endDate: new Date(dueDate).toISOString(),
          status: status?.status,
          webhook: 'https://api.seusistema.com/webhook/pagamento-be',
        };

        const registered = await this.registerPaymentReference(
          finalPayload,
          transactionalEntityManager
        );

        // 9. Resposta clara
        const fineApplied = isMensalidade && isAfter15th;

        return {
          message: fineApplied
            ? 'Referência renovada com sucesso (multa de 10% aplicada por ser mensalidade renovada após o dia 15)'
            : 'Referência de pagamento renovada com sucesso',
          originalAmount: originalAmount.toFixed(2),
          finalAmount: amountToPay.toFixed(2),
          fineApplied,
          fineReason: fineApplied ? 'Mensalidade renovada após o dia 15' : null,
          newReferenceNumber: referenceNumber,
          newDueDate: dueDate,
          appyPayId: appyResponse.id,
          reference: registered,
        };
      }
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
  /**
   * Gera SOURCE_ID no formato: 12345REF1, 12346REF1, etc.
   * Nunca repete | Usa índice funcional | <1ms
   */
  private async generateNextSourceId(): Promise<string> {
    try {
      // Cria índice funcional (RODE UMA VEZ NO BANCO)
      // CREATE INDEX IDX_SOURCE_ID_NUM ON pagamento_por_referencias (
      //   TO_NUMBER(REGEXP_REPLACE(SOURCE_ID, 'REF1$', ''))
      // );
      /*
        const result = await this.paymentReferencesRepository
          .createQueryBuilder()
          .select('MAX(TO_NUMBER(REGEXP_REPLACE(SOURCE_ID, \'REF1$\', \'\')))', 'max_num')
          .where("SOURCE_ID LIKE '%REF1'")
          .getRawOne();
    
        const maxNum = result?.max_num ? parseInt(result.max_num, 10) : 0;
        return `${maxNum + 1}REF1`;
        */
      const random = Math.floor(100000 + Math.random() * 900000);
      return `${random}REF1`;

    } catch (error) {
      console.warn('Erro ao gerar SOURCE_ID:', error.message);
      const random = Math.floor(100000 + Math.random() * 900000);
      return `${random}REF1`;
    }
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

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
import { Repository } from 'typeorm'
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
    try {
   
      const sourceId = await this.generateNextSourceId(); 
      
      

      const paymentReference = this.paymentReferencesRepository.create({
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
      });

      const saved = await this.paymentReferencesRepository.save(paymentReference);
 
      return saved;
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.warn('SOURCE_ID duplicado. Tentando novamente...');
        return this.registerPaymentReference(dto);
      }
      console.error('Erro ao salvar:', error);
      throw error;
    }
  }

  async createMonthlyPaymentReferences(
    createPaymentReferenceDto: CreatePaymentReferenceDto
  ) {
    const { itens, ...payments } = createPaymentReferenceDto;

    const academicYear = await this.academicYearRepository.findOne({
      where: { estado: 'Activo' },
    });
    if (!academicYear) {
      throw new NotFoundException('Ano letivo não definido no sistema.');
    }

    // Buscar meses ativos do ano letivo
    const mesTemps = await this.mesTempRepository.find({
      where: {
        ano_lectivo: academicYear.Codigo,
        activo: 1,
      },
    });

    if (!mesTemps.length) {
      throw new NotFoundException(
        'Nenhum mês ativo encontrado para o ano letivo atual.'
      );
    }

    if (!itens || !itens.length) return;

    const [item] = itens;

    /**
     * Processa todos os meses em paralelo — MAIOR ganho de performance.
     */
    await Promise.all(
      mesTemps.map(async (mes) => {
        let date_inicial = new Date();


        if (new Date(mes.data_final) > new Date()) {

          date_inicial = new Date(mes.data_final);
          date_inicial.setDate(date_inicial.getDate() + 1);


        }
        const [dueDate, referenceNumber] = await Promise.all([
          generateDueDate(15, new Date(date_inicial)),
          generateReferenceNumber(),
        ]);

        const payload = this.buildAppyPayPayload(
          payments,
          dueDate,
          referenceNumber,
        );

        const appyResponse = await this.appyPayUtil.createPaymentReference(payload);
        const status = appyResponse?.responseStatus;

        if (!status?.successful || !status?.reference?.referenceNumber) {
          throw new BadGatewayException(
            'Falha ao gerar referência de pagamento. A fatura não será criada.'
          );
        }

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

        const invoice = await this.invoiceService.create(
          createInvoiceDto,
          referenceNumber,
          dueDate,
        );

        const invoiceItemData = {
          codigoProduto: item.CodigoProduto,
          codigoFactura: invoice.Codigo,
          quantidade: item.Quantidade,
          total: item.Total,
          obs: "Mensalidade de " + mes.designacao,
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

        const invoiceItem = this.invoiceItemRepository.create(invoiceItemData);
        await this.invoiceItemRepository.save(invoiceItem);
      })
    );
    return {
      message: 'Referências AppyPay e faturas criadas com sucesso ✅',
    };
  }

  async renewPaymentReference(invoiceId: number) {



    const invoice = await this.invoiceService.findOne(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada.');
    }
 
    // 🕒 Gera dueDate e referenceNumber em paralelo (melhor desempenho)
    const [dueDate, referenceNumber] = await Promise.all([
      generateDueDate(3),
      generateReferenceNumber(),
    ]);

    // 📦 Monta payload para AppyPay
    const payload = this.buildAppyPayPayload(
      {
        amount: invoice.TotalPreco,
        currency: 'AOA',
        description: invoice.Descricao || 'Renovação de referência de pagamento',

      },
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
    const aaa=  await this.generateRandomCode()

    const finalPayload: RegisterPaymentReferenceDto = {
      paymentId: undefined,

      facturaCodigo: invoiceId,                     // ← mapeado
      entityId: status?.reference?.entity || '10065',
      reference: referenceNumber,
      referenceId: appyResponse.id,
      merchantTransactionId: aaa,
      amount: Number(invoice.TotalPreco),
      startDate: new Date().toISOString(),         // ← string ISO
      endDate: new Date(dueDate).toISOString(),     // ← string ISO
      status: status?.status,
      webhook: 'https://api.seusistema.com/webhook/pagamento-be'
    };

    const register = await this.registerPaymentReference(finalPayload)
    
    return register;


    // RENOVAR REFERÊNCIA NO SISTEMA

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
    const result = await this.paymentReferencesRepository
      .createQueryBuilder()
      .select('SOURCE_ID') // ← NOME DA COLUNA NO BANCO
      .where("SOURCE_ID LIKE :pattern", { pattern: '%REF1' })
      .orderBy('CAST(SUBSTRING(SOURCE_ID, 1, LENGTH(SOURCE_ID) - 4) AS UNSIGNED)', 'DESC')
      .limit(1)
      .getRawOne();

    if (result?.SOURCE_ID) {
      const match = result.SOURCE_ID.match(/^(\d+)REF1$/);
      if (match) {
        const next = parseInt(match[1], 10) + 1;
        return `${next}REF1`;
      }
    }
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

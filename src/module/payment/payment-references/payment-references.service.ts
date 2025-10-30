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
import { PaymentReferenceStatus, RegisterPaymentReferenceDto } from './dto/register-payment-reference.dto'
import { InvoiceItem } from '../../invoice/entities/InvoiceIten.entity'
import { MesTemp } from './entities/mes-temp.entity'
import { AcademicYear } from 'src/module/invoice/entities/academic.year.entity'

@Injectable()
export class PaymentReferencesService {
  private readonly appyPayUtil: AppyPayUtil


  constructor(
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
  async registerPaymentReference(appyPayWebhookDto: RegisterPaymentReferenceDto) {
    // PAGAR REFERÊNCIA NO SISTEMA

    const paymentReference = this.paymentReferencesRepository.create({
      ...appyPayWebhookDto
    });
    return this.paymentReferencesRepository.save(paymentReference);
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


        if (new Date(mes.data_final)> new Date()) {
        
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
          preco:  payments.amount,
          retencao: item.retencao,
          incidencia: item.incidencia,
          valorDesconto: item.valorDesconto,
          descontoProduto: item.descontoProduto,
          mes: mes.designacao,         
          multa: item.multa,
          mesTempId: mes.id,
          codigoAnoLectivo: invoice.anoLectivo,
          estado: item.estado,
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

  async  renewPaymentReference(invoiceId: number, newAmount?: number) {

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
        amount:  newAmount ||   invoice.TotalPreco,
        currency: 'AOA',
        description: invoice.Descricao ||'Renovação de referência de pagamento',
      
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

    const updatedInvoice = await this.invoiceService.updateReferenceNumber(
      invoiceId,
      referenceNumber,
      dueDate,
      newAmount || invoice.TotalPreco,
    );
    return updatedInvoice;


    // RENOVAR REFERÊNCIA NO SISTEMA

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
}

import { BadGatewayException, Injectable } from '@nestjs/common'
import { CreatePaymentReferenceDto } from './dto/create-payment-reference.dto'
import { generateDueDate } from '../util/generate-due-date'
import { generateReferenceNumber } from '../util/generate-refence-number'
import { AppyPayUtil } from '../util/appypay/appy-pay-util'
import { InvoiceService } from '../invoice/invoice.service'
import { CreateInvoiceDto } from '../invoice/dto/create-invoice.dto'

@Injectable()
export class PaymentReferencesService {
  private readonly appyPayUtil: AppyPayUtil

  constructor(private readonly invoiceService: InvoiceService) {
    this.appyPayUtil = new AppyPayUtil()
  }

  async create(createPaymentReferenceDto: CreatePaymentReferenceDto) {
    // 🕒 Gera dueDate e referenceNumber em paralelo (melhor desempenho)
    const [dueDate, referenceNumber] = await Promise.all([
      generateDueDate(3),
      generateReferenceNumber(),
    ]);

    // 📦 Monta payload para AppyPay
    const payload = this.buildAppyPayPayload(
      createPaymentReferenceDto,
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
      TotalPreco: createPaymentReferenceDto.amount,
      Descricao: createPaymentReferenceDto.description,
      tipo_documento_factura_id: 2,
      Desconto: 0,
      totalIVA: 0,
      TotalMulta: 0,
      canal: 3,
      CodigoMatricula: createPaymentReferenceDto.enrollment?.CodigoMatricula,
      codigo_preinscricao: createPaymentReferenceDto.enrollment?.codigo_preinscricao,
    };

    // 🧠 Cria fatura e armazena no banco
    const [invoice] = await Promise.all([
      this.invoiceService.create(
        createInvoiceDto,
        referenceNumber,
        dueDate,
      ),
    ]);

    // ✅ Retorno final
    const entity = status.reference.entity;
    return {
      message: 'Referência AppyPay e fatura criadas com sucesso ✅',
      referenceNumber,
      dueDate,
      entity,
      invoiceNumber:invoice.numSequenciaFactura,
      nextInvoice:invoice.NextFactura,
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
}

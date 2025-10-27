import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';
import { AppyPayWebhookDto } from './dto/appypay-webhook.dto';
import { PaymentReferencesService } from '../payment-references/payment-references.service';
import { PaymentReferenceStatus, RegisterPaymentReferenceDto } from '../payment-references/dto/register-payment-reference.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly invoiceService: InvoiceService, private readonly paymentReferencesService: PaymentReferencesService) { }

  /**
   * Processa eventos recebidos do AppyPay
   */
  async processAppyPayEvent(payload: AppyPayWebhookDto, signature?: string) {
    this.logger.log('🔔 Recebendo Webhook do AppyPay...');
    this.logger.debug(payload);

    if (!payload?.reference?.referenceNumber) {
      throw new BadRequestException('Payload inválido — número de referência ausente.');
    }

    // Simula validação de assinatura (caso o AppyPay envie)
    if (signature) {
      this.logger.log(`Assinatura recebida: ${signature}`);
      // TODO: validar assinatura real com chave secreta, se disponível
    }
    const reference = payload.reference.referenceNumber;
    const status = payload.status ?? payload.responseStatus?.status ?? 'Unknown';
    const entidade = payload.reference?.entity ?? 'Unknown';
    const paymentId = payload.id ?? undefined;

    // Atualiza o status da fatura com base na referência
    try {
      await this.invoiceService.updateStatusByReference(reference, 1);

      const invoice = await this.invoiceService.findByReference(reference);
      if (!invoice) {
        this.logger.warn(`Fatura não encontrada para a referência: ${reference}`);
        return { success: false, message: 'Fatura não encontrada para a referência fornecida' };
      }
      const registerPayload: RegisterPaymentReferenceDto = {
        sourceId: invoice.NextFactura.toString(), // Representa o código da factura no Mutue
        facturaCodigo: invoice.Codigo, // Código interno da Factura
        entityId: entidade, // Entidade associada à referência
        reference: reference, // A referência de pagamento
        amount: invoice.TotalPreco, // Valor a pagar
        startDate: invoice.DataFactura.toISOString(),

        // CORREÇÃO AQUI: Usar toISOString() para obter o formato string esperado pelo DTO
        // Certifique-se de que 'invoice.dataVencimento' é um objeto Date ou é tratado.
       endDate:invoice.dataVencimento as unknown  as string,

        status: PaymentReferenceStatus.PAID,
        paymentId: paymentId,
        referenceId: 'REF-ID-EXTERNO-12345',
        merchantTransactionId: 'MERCHANT-TXN-12345',
        webhook: '{"event": "reference_created", "data": {...}}',
      };
      await this.paymentReferencesService.registerPaymentReference(registerPayload);
      this.logger.log(`✅ Fatura com referência ${reference} atualizada para status: ${status}`);
    } catch (err) {
      this.logger.error(`Erro ao atualizar fatura: ${err.message}`);
    }

    return { success: true, message: 'Webhook processado com sucesso' };
  }
}

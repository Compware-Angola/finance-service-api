import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentReferencesModule } from '../payment-references/payment-references.module';

@Module({
  imports: [InvoiceModule,PaymentReferencesModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}

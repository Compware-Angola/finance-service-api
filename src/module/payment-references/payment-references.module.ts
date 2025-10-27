import { Module } from '@nestjs/common';
import { PaymentReferencesService } from './payment-references.service';
import { PaymentReferencesController } from './payment-references.controller';
import { InvoiceModule } from '../invoice/invoice.module'; // ✅ já exporta o InvoiceService

@Module({
  imports: [InvoiceModule], // 👈 importa o módulo de faturas
  controllers: [PaymentReferencesController],
  providers: [PaymentReferencesService], 
})
export class PaymentReferencesModule {}

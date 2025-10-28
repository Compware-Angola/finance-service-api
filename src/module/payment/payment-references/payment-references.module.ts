import { Module } from '@nestjs/common';
import { PaymentReferencesService } from './payment-references.service';
import { PaymentReferencesController } from './payment-references.controller';
import { InvoiceModule } from '../../invoice/invoice.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentReferences } from './entities/payment-reference.entity';
import { InvoiceItem } from '../../invoice/entities/InvoiceIten.entity';

@Module({
  imports: [InvoiceModule,TypeOrmModule.forFeature([PaymentReferences,InvoiceItem])],
  controllers: [PaymentReferencesController],
  providers: [PaymentReferencesService],
  exports: [PaymentReferencesService],
})
export class PaymentReferencesModule {}

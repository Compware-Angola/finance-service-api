import { Module } from '@nestjs/common';
import { PaymentReferencesService } from './payment-references.service';
import { PaymentReferencesController } from './payment-references.controller';
import { InvoiceModule } from '../invoice/invoice.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentReferences } from './entities/payment-reference.entity';

@Module({
  imports: [InvoiceModule,TypeOrmModule.forFeature([PaymentReferences])],
  controllers: [PaymentReferencesController],
  providers: [PaymentReferencesService],
  exports: [PaymentReferencesService],
})
export class PaymentReferencesModule {}

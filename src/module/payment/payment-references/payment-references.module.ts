// src/module/payment-references/payment-references.module.ts
import { Module } from '@nestjs/common';
import { PaymentReferencesService } from './payment-references.service';
import { PaymentReferencesController } from './payment-references.controller';
import { InvoiceModule } from '../../invoice/invoice.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentReferences } from './entities/payment-reference.entity';
import { InvoiceItem } from '../../invoice/entities/InvoiceIten.entity';
import { MesTemp } from './entities/mes-temp.entity';
import { AcademicYear } from 'src/module/invoice/entities/academic.year.entity';
import { BullModule } from '@nestjs/bullmq';
import { CreatePaymentReferencesProcessor } from 'src/module/jobs/create-payment-references.processor';
import { ListPaymentRefenceController } from './list-payment-references.controller';
import { ListPaymentRefenceService } from './list-payment-references.service';

@Module({
  imports: [
    InvoiceModule,
    TypeOrmModule.forFeature([PaymentReferences, InvoiceItem, MesTemp, AcademicYear]),
    BullModule.registerQueue({
      name: 'payment_reference_service',
    }),
  ],
  controllers: [PaymentReferencesController,ListPaymentRefenceController],
  providers: [PaymentReferencesService, CreatePaymentReferencesProcessor,ListPaymentRefenceService], 
  exports: [PaymentReferencesService,CreatePaymentReferencesProcessor],
})
export class PaymentReferencesModule {}
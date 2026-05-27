import { Module } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreditoEducacionalController } from './credito_educacional.controller';
import { PaymentModule } from '../payment/payment.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear]),
    PaymentModule],
  controllers: [CreditoEducacionalController],
  providers: [CreditoEducacionalService, AnoLectivoUtil],
  exports: [CreditoEducacionalService],
})
export class CreditoEducacionalModule { }
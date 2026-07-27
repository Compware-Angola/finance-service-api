import { Module } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreditoEducacionalController } from './credito_educacional.controller';
import { PaymentModule } from '../payment/payment.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { PagamentosBolsaInstituicaoModule } from './pagamentos_bolsa_instituicao/pagamentos_bolsa_instituicao.module';
import { TipoCandidatura } from '../invoice/entities/tipo.candidatura.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicYear, TipoCandidatura]),
    PaymentModule,
    PagamentosBolsaInstituicaoModule,
  ],
  controllers: [CreditoEducacionalController],
  providers: [CreditoEducacionalService, AnoLectivoUtil],
  exports: [CreditoEducacionalService],
})
export class CreditoEducacionalModule {}

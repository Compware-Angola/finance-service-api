import { Module } from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { MonthlyFeesController } from './monthly_fees.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';
import { MonthlyFeesDiscountUtilService } from 'src/modules/shared/monthly_fees/monthly_fees.discount.Util.service';
import { AnoLectivoUtil } from 'src/modules/util/current-academic-year';
import { MonthlyFeePosGraduationService } from './monthly-fee-posgraduation.service';
import { AcademicYear } from 'src/modules/invoice/entities/academic.year.entity';
import { TipoCandidatura } from 'src/modules/invoice/entities/tipo.candidatura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MesTemp, AcademicYear, TipoCandidatura])],
  controllers: [MonthlyFeesController],
  providers: [
    MonthlyFeesService,
    MonthlyFeesDiscountUtilService,
    AnoLectivoUtil,
    MonthlyFeePosGraduationService,
  ],
})
export class MonthlyFeesModule { }

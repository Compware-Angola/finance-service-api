import { Module } from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { MonthlyFeesController } from './monthly_fees.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';
import { MonthlyFeesDiscountService } from './monthly_fees.discount.service';

@Module({
  imports: [TypeOrmModule.forFeature([MesTemp])],
  controllers: [MonthlyFeesController],
  providers: [MonthlyFeesService, MonthlyFeesDiscountService],
})
export class MonthlyFeesModule {}

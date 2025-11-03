import { Module } from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { MonthlyFeesController } from './monthly_fees.controller';

@Module({
  controllers: [MonthlyFeesController],
  providers: [MonthlyFeesService],
})
export class MonthlyFeesModule {}

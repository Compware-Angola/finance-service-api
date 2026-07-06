import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CashRegister } from './entities/cash-register.entity';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';
import { HttpModule } from '@nestjs/axios';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';
import { CashRegisterSummaryService } from './cash-register-summary.service';
import { PaymentAnalyticsService } from './payment-analytics.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([CashRegister, CashRegisterMovement]),
  ],
  controllers: [CashRegistersController],
  providers: [
    CashRegistersService,
    CashRegisterSummaryService,
    PaymentAnalyticsService],
  exports: [],
})
export class CashRegistersModule { }

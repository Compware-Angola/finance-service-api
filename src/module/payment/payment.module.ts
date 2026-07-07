import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyFeesModule } from './monthly_fees/monthly_fees.module';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { MesTemp } from './payment-references/entities/mes-temp.entity';
import { InvoiceItem } from '../invoice/entities/InvoiceIten.entity';
import { InvoiceModule } from '../invoice/invoice.module';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { HttpModule } from '@nestjs/axios/dist/http.module';
import { Payment2 } from './entities/payment2.entity';
import { EstatisticasService } from './estatisticas.service';
import { CashRegister } from '../cash-registers/entities/cash-register.entity';
import { CashRegisterMovement } from '../cash-registers/entities/cash-register-movement.entity';
import { CashRegistersService } from '../cash-registers/cash-registers.service';
import { VoidPaymentService } from './void-payments.service';
import { VoidPaymentTaxService } from './void-payments-tax.service';
import { PaymentAnalyticsService } from '../cash-registers/payment-analytics.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      Payment,
      Payment2,
      InvoiceItem,
      MesTemp,
      AcademicYear,
      CashRegister,
      CashRegisterMovement,
    ]),
    MonthlyFeesModule,
    InvoiceModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    AnoLectivoUtil,
    EstatisticasService,
    PaymentAnalyticsService,
    CashRegistersService,
    VoidPaymentService,
    VoidPaymentTaxService,
  ],
  exports: [PaymentService],
})
export class PaymentModule { }

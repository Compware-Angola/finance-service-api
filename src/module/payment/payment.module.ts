import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyFeesModule } from './monthly_fees/monthly_fees.module';

@Module({
  imports: [ TypeOrmModule.forFeature([Payment]), MonthlyFeesModule,],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}

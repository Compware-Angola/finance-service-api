import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentRefsModule } from './payment_refs/payment_refs.module';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  imports: [PaymentRefsModule],
})
export class PaymentsModule {}

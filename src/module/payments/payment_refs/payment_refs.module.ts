import { Module } from '@nestjs/common';
import { PaymentRefsService } from './payment_refs.service';
import { PaymentRefsController } from './payment_refs.controller';

@Module({
  controllers: [PaymentRefsController],
  providers: [PaymentRefsService],
})
export class PaymentRefsModule {}

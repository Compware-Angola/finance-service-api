import { Module } from '@nestjs/common';
import { PaymentTfcService } from './payment-tfc.service';
import { PaymentTfcController } from './payment-tfc.controller';

@Module({
  controllers: [PaymentTfcController],
  providers: [PaymentTfcService],
})
export class PaymentTfcModule {}

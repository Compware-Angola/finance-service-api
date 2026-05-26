import { Module } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreditoEducacionalController } from './credito_educacional.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [CreditoEducacionalController],
  providers: [CreditoEducacionalService],
  exports: [CreditoEducacionalService],
})
export class CreditoEducacionalModule { }
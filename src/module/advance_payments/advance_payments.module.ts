import { Module } from '@nestjs/common';
import { AdvancePaymentsService } from './advance_payments.service';
import { AdvancePaymentsController } from './advance_payments.controller';

@Module({
  controllers: [AdvancePaymentsController],
  providers: [AdvancePaymentsService],
})
export class AdvancePaymentsModule {}

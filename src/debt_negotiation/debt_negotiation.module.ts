import { Module } from '@nestjs/common';
import { DebtNegotiationService } from './debt_negotiation.service';
import { DebtNegotiationController } from './debt_negotiation.controller';

@Module({
  controllers: [DebtNegotiationController],
  providers: [DebtNegotiationService],
})
export class DebtNegotiationModule {}

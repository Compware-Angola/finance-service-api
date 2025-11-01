import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DebtNegotiationService } from './debt_negotiation.service';

@Controller('debt-negotiation')
export class DebtNegotiationController {
  constructor(private readonly debtNegotiationService: DebtNegotiationService) {}

  @Get()
  getDebt() {
    return this.debtNegotiationService.getDebt();
  }
}

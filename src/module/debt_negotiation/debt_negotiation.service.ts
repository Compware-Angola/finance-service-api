import { Injectable } from '@nestjs/common';
import { CreateDebtNegotiationDto } from './dto/create-debt_negotiation.dto';
import { UpdateDebtNegotiationDto } from './dto/update-debt_negotiation.dto';

@Injectable()
export class DebtNegotiationService {
  create(createDebtNegotiationDto: CreateDebtNegotiationDto) {
    return 'This action adds a new debtNegotiation';
  }

  findAll() {
    return `This action returns all debtNegotiation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} debtNegotiation`;
  }

  update(id: number, updateDebtNegotiationDto: UpdateDebtNegotiationDto) {
    return `This action updates a #${id} debtNegotiation`;
  }

  remove(id: number) {
    return `This action removes a #${id} debtNegotiation`;
  }
}

import { Injectable } from '@nestjs/common';
import { CreateAdvancePaymentDto } from './dto/create-advance_payment.dto';
import { UpdateAdvancePaymentDto } from './dto/update-advance_payment.dto';

@Injectable()
export class AdvancePaymentsService {
  create(createAdvancePaymentDto: CreateAdvancePaymentDto) {
    return 'This action adds a new advancePayment';
  }

  findAll() {
    return `This action returns all advancePayments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} advancePayment`;
  }

  update(id: number, updateAdvancePaymentDto: UpdateAdvancePaymentDto) {
    return `This action updates a #${id} advancePayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} advancePayment`;
  }
}

import { Injectable } from '@nestjs/common';
import { CreatePaymentRefDto } from './dto/create-payment_ref.dto';
import { UpdatePaymentRefDto } from './dto/update-payment_ref.dto';

@Injectable()
export class PaymentRefsService {
  create(createPaymentRefDto: CreatePaymentRefDto) {
    return 'This action adds a new paymentRef';
  }

  findAll() {
    return `This action returns all paymentRefs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentRef`;
  }

  update(id: number, updatePaymentRefDto: UpdatePaymentRefDto) {
    return `This action updates a #${id} paymentRef`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentRef`;
  }
}

import { Injectable } from '@nestjs/common';
import { CreatePaymentTfcDto } from './dto/create-payment-tfc.dto';
import { UpdatePaymentTfcDto } from './dto/update-payment-tfc.dto';

@Injectable()
export class PaymentTfcService {
  create(createPaymentTfcDto: CreatePaymentTfcDto) {
    return 'This action adds a new paymentTfc';
  }

  findAll() {
    return `This action returns all paymentTfc`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentTfc`;
  }

  update(id: number, updatePaymentTfcDto: UpdatePaymentTfcDto) {
    return `This action updates a #${id} paymentTfc`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentTfc`;
  }
}

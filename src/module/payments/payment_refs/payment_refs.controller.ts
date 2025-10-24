import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentRefsService } from './payment_refs.service';
import { CreatePaymentRefDto } from './dto/create-payment_ref.dto';
import { UpdatePaymentRefDto } from './dto/update-payment_ref.dto';

@Controller('payment-refs')
export class PaymentRefsController {
  constructor(private readonly paymentRefsService: PaymentRefsService) {}

  @Post()
  create(@Body() createPaymentRefDto: CreatePaymentRefDto) {
    return this.paymentRefsService.create(createPaymentRefDto);
  }

  @Get()
  findAll() {
    return this.paymentRefsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentRefsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentRefDto: UpdatePaymentRefDto) {
    return this.paymentRefsService.update(+id, updatePaymentRefDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentRefsService.remove(+id);
  }
}

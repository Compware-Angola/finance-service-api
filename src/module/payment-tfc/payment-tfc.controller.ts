import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentTfcService } from './payment-tfc.service';
import { CreatePaymentTfcDto } from './dto/create-payment-tfc.dto';
import { UpdatePaymentTfcDto } from './dto/update-payment-tfc.dto';

@Controller('payment-tfc')
export class PaymentTfcController {
  constructor(private readonly paymentTfcService: PaymentTfcService) {}

  @Post()
  create(@Body() createPaymentTfcDto: CreatePaymentTfcDto) {
    return this.paymentTfcService.create(createPaymentTfcDto);
  }

  @Get()
  findAll() {
    return this.paymentTfcService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentTfcService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentTfcDto: UpdatePaymentTfcDto) {
    return this.paymentTfcService.update(+id, updatePaymentTfcDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentTfcService.remove(+id);
  }
}

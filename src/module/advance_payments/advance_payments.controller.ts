import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdvancePaymentsService } from './advance_payments.service';
import { CreateAdvancePaymentDto } from './dto/create-advance_payment.dto';
import { UpdateAdvancePaymentDto } from './dto/update-advance_payment.dto';

@Controller('advance-payments')
export class AdvancePaymentsController {
  constructor(private readonly advancePaymentsService: AdvancePaymentsService) {}

  @Post()
  create(@Body() createAdvancePaymentDto: CreateAdvancePaymentDto) {
    return this.advancePaymentsService.create(createAdvancePaymentDto);
  }

  @Get()
  findAll() {
    return this.advancePaymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advancePaymentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdvancePaymentDto: UpdateAdvancePaymentDto) {
    return this.advancePaymentsService.update(+id, updateAdvancePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.advancePaymentsService.remove(+id);
  }
}

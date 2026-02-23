import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PaymentTfcService } from './payment-tfc.service';
import { CreatePaymentTfcDto } from './dto/create-payment-tfc.dto';
import { UpdatePaymentTfcDto } from './dto/update-payment-tfc.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindPaymentTFCDTO } from './dto/find-payment-tfc.dto';

@Controller('payment-tfc')
export class PaymentTfcController {
  constructor(private readonly paymentTfcService: PaymentTfcService) {}
  @Get('payments-tfc')
  @ApiOperation({ summary: 'Lista de pagamentos TFC' })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos TFC.',
  })
  async getStudentPayments(@Query() query: FindPaymentTFCDTO) {
    return this.paymentTfcService.findPagamentosTFC(query);
  }
}

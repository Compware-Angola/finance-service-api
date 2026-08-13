import { PartialType } from '@nestjs/swagger';
import { CreatePaymentTfcDto } from './create-payment-tfc.dto';

export class UpdatePaymentTfcDto extends PartialType(CreatePaymentTfcDto) {}

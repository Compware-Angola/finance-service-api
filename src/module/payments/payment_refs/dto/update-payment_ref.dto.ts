import { PartialType } from '@nestjs/swagger';
import { CreatePaymentRefDto } from './create-payment_ref.dto';

export class UpdatePaymentRefDto extends PartialType(CreatePaymentRefDto) {}

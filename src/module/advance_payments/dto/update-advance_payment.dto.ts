import { PartialType } from '@nestjs/swagger';
import { CreateAdvancePaymentDto } from './create-advance_payment.dto';

export class UpdateAdvancePaymentDto extends PartialType(CreateAdvancePaymentDto) {}

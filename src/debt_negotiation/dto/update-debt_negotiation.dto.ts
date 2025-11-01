import { PartialType } from '@nestjs/swagger';
import { CreateDebtNegotiationDto } from './create-debt_negotiation.dto';

export class UpdateDebtNegotiationDto extends PartialType(CreateDebtNegotiationDto) {}

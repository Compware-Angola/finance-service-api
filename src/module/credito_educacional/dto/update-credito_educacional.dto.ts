import { PartialType } from '@nestjs/swagger';
import { CreateCreditoEducacionalDto } from './create-credito_educacional.dto';

export class UpdateCreditoEducacionalDto extends PartialType(CreateCreditoEducacionalDto) {}

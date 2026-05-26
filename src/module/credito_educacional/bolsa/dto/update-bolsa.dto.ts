import { PartialType } from '@nestjs/swagger';
import { CreateBolsaDto } from './create-bolsa.dto';

export class UpdateBolsaDto extends PartialType(CreateBolsaDto) {}

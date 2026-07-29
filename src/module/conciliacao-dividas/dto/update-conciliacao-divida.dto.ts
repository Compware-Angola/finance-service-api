import { PartialType } from '@nestjs/swagger';
import { CreateConciliacaoDividaDto } from './create-conciliacao-divida.dto';

export class UpdateConciliacaoDividaDto extends PartialType(CreateConciliacaoDividaDto) {}

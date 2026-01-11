import { PartialType } from '@nestjs/swagger';
import { CreateTypeServiceDto } from './create-type_service.dto';

export class UpdateTypeServiceDto extends PartialType(CreateTypeServiceDto) {}

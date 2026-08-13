import { CreateAddDiscountDto } from './create-add-discount.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateAddDiscountDto extends PartialType(CreateAddDiscountDto) {}

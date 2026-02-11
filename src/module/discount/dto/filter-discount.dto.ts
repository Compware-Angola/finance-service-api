import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterDiscountDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Código do desconto', required: false })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty({
    description: 'Designação/Descrição do desconto',
    required: false,
  })
  @IsOptional()
  @IsString()
  designacao?: string;
}

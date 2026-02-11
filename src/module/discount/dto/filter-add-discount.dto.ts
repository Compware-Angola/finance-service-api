import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FilterAddDiscountDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Código do desconto', required: false })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiProperty({ description: 'Código do ano lectivo', required: false })
  @IsOptional()
  @IsString()
  codigoAnoLectivo?: string;

  @ApiProperty({ description: 'Semestre', required: false })
  @IsOptional()
  @IsString()
  semestre?: string;

  @ApiProperty({ description: 'Código da matricula', required: false })
  @IsOptional()
  @IsString()
  codigoMatricula?: string;
}

import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Type } from 'class-transformer';

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

  @ApiPropertyOptional({
    description: 'Código da Instituição',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoInstituicao?: number;

  @ApiPropertyOptional({
    description:
      'Código da afectacao 1 - Pagamentos de Propinas e 2 - Pagamentos Globais',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  afectacao?: number;
}

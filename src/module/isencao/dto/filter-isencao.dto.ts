import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsOptional, IsNumber, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterIsencaoDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Código da matrícula', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiProperty({ description: 'Código do serviço', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoServico?: number;

  @ApiProperty({ description: 'Código do Curso', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiProperty({ description: 'Faculdade', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  faculdadeId?: number;

  @ApiProperty({ description: 'Código do Ano Lectivo', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiProperty({ description: 'Estado da isenção', required: false })
  @IsOptional()
  @IsString()
  @Type(() => Number)
  estadoIsencao?: string;
}

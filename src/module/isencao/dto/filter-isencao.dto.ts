import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsOptional, IsNumber, IsString } from 'class-validator';
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

  @ApiProperty({ description: 'Estado da isenção', required: false })
  @IsOptional()
  @IsString()
  estadoIsencao?: string;
}

import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListContratoBolsaQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar pelo código da instituição',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoInstituicao?: number;

  @ApiPropertyOptional({
    description: 'Filtrar pelo código do contrato',
    example: 394409,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoContrato?: number;
}

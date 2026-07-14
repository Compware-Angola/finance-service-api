import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    description: 'Número de registos por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;
}

export class ContratoBolsaEstatisticasQueryDto extends OmitType(
  ListContratoBolsaQueryDto,
  ['limit', 'page'] as const,
) {}

import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindPaymentTFCDTO {
  @ApiProperty({
    description: 'O código do ano letivo para filtragem (obrigatório).',
    type: Number,
    example: 21,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;

  @ApiPropertyOptional({ description: 'Código da Curso', example: 15 })
  @IsOptional()
  @Type(() => Number)
  curso?: number;

  @ApiPropertyOptional({ description: 'Código da Periodo', example: 5 })
  @IsOptional()
  @Type(() => Number)
  periodoId?: number;

  @ApiPropertyOptional({ description: 'Estado da Factura', example: 1 })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}

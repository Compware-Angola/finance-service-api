import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

import { Transform } from 'class-transformer';

export class FilterFormaPagamentoDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtrar por status',
    enum: [0, 1],
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsIn([0, 1], {
    message: 'Status deve ser 0 ou 1',
  })
  status?: number;

  @ApiPropertyOptional({
    example: 'TPA',
    description: 'Pesquisar por descrição',
  })
  @IsOptional()
  @IsString({
    message: 'Search deve ser texto',
  })
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Pesquisar por código',
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt({
    message: 'Código inválido',
  })
  codigo?: number;
}

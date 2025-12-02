// src/exempt-days/dto/create-exempt-day.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsString,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExemptDayDto {
  @ApiPropertyOptional({
    description: 'Data de início do dia excecional (YYYY-MM-DD)',
    example: '2025-12-24',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'dataInicio deve ser uma data válida no formato YYYY-MM-DD' },
  )
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do dia excecional (YYYY-MM-DD). Usado para períodos.',
    example: '2025-12-26',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'dataFim deve ser uma data válida no formato YYYY-MM-DD' },
  )
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Observação ou motivo do dia excecional',
    example: 'Feriado de Natal e dias seguintes',
  })
  @IsOptional()
  @IsString({ message: 'observacao deve ser um texto' })
  @IsNotEmpty({ message: 'observacao não pode ser vazia se for informada' })
  observacao?: string;

  @ApiPropertyOptional({
    description: 'Estado do registo: 1 = ativo, 0 = inativo',
    example: 1,
    enum: [0, 1],
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '1' || value === 1 || value === true ? 1 : 0))
  @IsIn([0, 1], { message: 'estado deve ser 0 (inativo) ou 1 (ativo)' })
  estado?: 0 | 1;
}
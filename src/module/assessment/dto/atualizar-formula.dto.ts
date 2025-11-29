// src/formulas-uc/dto/atualizar-formula.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AtualizarFormulaDto {
  @ApiProperty({
    description: 'Código da linha na tabela FK2_TB_PLANO_CURRICULAR_GRADE',
    example: 1567,
  })
  @IsInt({ message: 'O código deve ser um número inteiro' })
  @Type(() => Number)
  codigo: number;

  @ApiPropertyOptional({
    description: 'Nota mínima na componente prática (0–20)',
    example: 10,
    minimum: 0,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota mínima prática deve ser numérico' })
  @Min(0)
  notaMinPratica?: number;

  @ApiPropertyOptional({
    description: 'Peso da componente prática (0–100%)',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Peso prática deve ser numérico' })
  @Min(0)
  pesoPratica?: number;

  @ApiPropertyOptional({
    description: 'Nota mínima na 1ª frequência (0–20)',
    example: 9.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota mínima 1ª freq deve ser numérico' })
  @Min(0)
  notaMinPrimeiraFreq?: number;

  @ApiPropertyOptional({
    description: 'Peso da 1ª frequência (0–100%)',
    example: 35,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Peso 1ª freq deve ser numérico' })
  @Min(0)
  pesoPrimeiraFreq?: number;

  @ApiPropertyOptional({
    description: 'Nota mínima na 2ª frequência (0–20)',
    example: 9.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota mínima 2ª freq deve ser numérico' })
  @Min(0)
  notaMinSegundaFreq?: number;

  @ApiPropertyOptional({
    description: 'Peso da 2ª frequência (0–100%)',
    example: 35,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Peso 2ª freq deve ser numérico' })
  @Min(0)
  pesoSegundaFreq?: number;
}
// src/debt-negotiation/dto/get-debt.dto.ts
import { IsNumber, IsOptional, IsString, Max, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetDebtDto {
  @ApiProperty({
    description: 'ID da matrícula do aluno (obrigatório)',
    example: 57358,
    minimum: 1,
  })
  @IsNumber({}, { message: 'O ID da matrícula deve ser um número inteiro' })
  @IsPositive({ message: 'O ID da matrícula deve ser um número positivo' })
  @Min(1, { message: 'O ID da matrícula deve ser maior ou igual a 1' })
  @Type(() => Number)
  matricula: number;

  @ApiProperty({
    description: 'ID da pré-inscrição do aluno (obrigatório)',
    example: 116945,
    minimum: 1,
  })
  @IsNumber({}, { message: 'O ID da pré-inscrição deve ser um número inteiro' })
  @IsPositive({ message: 'O ID da pré-inscrição deve ser um número positivo' })
  @Min(1, { message: 'O ID da pré-inscrição deve ser maior ou igual a 1' })
  @Type(() => Number)
  preinscricaoId: number;

  @ApiProperty({
    description: 'Tipo de consulta de dívida:\n1 = Todas as dívidas (todos os anos)\n2 = Dívidas do ano letivo específico (usa o parâmetro anoLectivo)\n3 = Apenas propinas do ano corrente (ignorando outros serviços antigos)',
    example: 2,
    enum: [1, 2, 3],
  })
  @IsNumber({}, { message: 'O tipo de candidatura deve ser um número' })
  @Min(1, { message: 'O tipo deve ser 1, 2 ou 3' })
  @Max(3, { message: 'O tipo deve ser 1, 2 ou 3' })
  @Type(() => Number)
  tipo: number;

  @ApiPropertyOptional({
    description: 'ID do ano letivo (obrigatório quando tipo = 2)',
    example: 23,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O ano letivo deve ser um número' })
  @Min(1, { message: 'O ano letivo deve ser a partir de 2000' })
  @Type(() => Number)
  anoLectivo?: number;


}
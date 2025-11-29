// src/assessment/dto/buscar-notas.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class BuscarNotasDto {
  @ApiProperty({
    description: 'ID da turma (antigo) ou do horário (novo - pk_horario)',
    example: 512,
    minimum: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'O ID da turma/horário é obrigatório' })
  @IsNumber({}, { message: 'Deve ser um número válido' })
  @IsInt({ message: 'Deve ser um número inteiro' })
  @IsPositive({ message: 'Deve ser maior que zero' })
  @Transform(({ value }) => Number(value))
  turmaOuHorarioId: number;

  @ApiProperty({
    description: 'Código do tipo de avaliação (ex: 1=Teste, 2=Exame, 3=Trabalho, 4=Recurso...)',
    example: 1,
    minimum: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'Tipo de avaliação é obrigatório' })
  @IsNumber({}, { message: 'Tipo de avaliação deve ser um número' })
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  tipoAvaliacaoId: number;

  @ApiProperty({
    description:
      'Código do ano letivo. Se ≤ 17 → busca por turma. Se > 17 → busca por horário.',
    example: 19,
    minimum: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'Ano letivo é obrigatório' })
  @IsNumber({}, { message: 'Ano letivo deve ser um número' })
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  anoLectivoId: number;
}
// src/formulas-uc/dto/listar-unidades-curriculares.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class ListarUnidadesCurricularesDto {
  @ApiProperty({ description: 'Código do curso', example: 10 })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  cursoId: number;

  @ApiProperty({ description: 'Código do ano letivo', example: 22 })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  anoLectivoId: number;

  @ApiProperty({ description: 'Ano curricular (1º, 2º, 3º ano)', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  anoCurricular: number;

  @ApiProperty({ description: 'Semestre (1 ou 2)', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  semestre: number;
}
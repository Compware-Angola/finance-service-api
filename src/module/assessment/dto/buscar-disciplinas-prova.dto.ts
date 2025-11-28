// src/lancamento-notas/dto/buscar-disciplinas-prova.dto.ts

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum FiltroNota {
  TODAS = 0,
  COM_NOTA = 1,
  SEM_NOTA = 2,
}

export class BuscarDisciplinasProvaDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  verHorario?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  filtro?: FiltroNota = FiltroNota.TODAS;

  // Quando verHorario = true → usa grade
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeSelecionada?: number;

  // Quando verHorario = false → usa curso
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursoSelecionado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoCurricularSelecionado?: number;

  @IsOptional()
  @IsString()
  semestreSelecionado?: string; // ex: "2025/1", "1º Semestre", etc.

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivoSelecionado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoProvaSelecionada?: number; // ex: 1 = Normal, 2 = Recorrência, etc.

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoAvaliacaoSelecionada?: number; // ex: 1 = Teste, 2 = Exame, 3 = Trabalho
}
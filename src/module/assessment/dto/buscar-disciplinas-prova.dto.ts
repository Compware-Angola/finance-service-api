import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    description: 'Exibe o horário das disciplinas (usa grade ao invés de curso)',
    type: Boolean,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  verHorario?: boolean = false;

  @ApiPropertyOptional({
    description: 'Filtrar disciplinas por situação da nota',
    enum: FiltroNota,
    enumName: 'FiltroNota',
    default: FiltroNota.TODAS,
    example: FiltroNota.COM_NOTA,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsEnum(FiltroNota)
  filtro?: FiltroNota = FiltroNota.TODAS;

  @ApiPropertyOptional({
    description: 'ID da grade curricular (usado quando verHorario = true)',
    type: Number,
    example: 42,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeSelecionada?: number;

  @ApiPropertyOptional({
    description: 'ID do curso (usado quando verHorario = false)',
    type: Number,
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursoSelecionado?: number;

  @ApiPropertyOptional({
    description: 'Ano curricular (1º, 2º, 3º ano etc.)',
    type: Number,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoCurricularSelecionado?: number;

  @ApiPropertyOptional({
    description: 'Semestre/Período letivo',
    type: String,
    example: '2025/1',
  })
  @IsOptional()
  @IsString()
  semestreSelecionado?: string;

  @ApiPropertyOptional({
    description: 'Ano letivo',
    type: Number,
    example: 2025,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivoSelecionado?: number;

  @ApiPropertyOptional({
    description: 'Tipo de prova (1 = Normal, 2 = Recuperação, etc.)',
    type: Number,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoProvaSelecionada?: number;

  @ApiPropertyOptional({
    description: 'Tipo de avaliação (1 = Teste, 2 = Exame, 3 = Trabalho, etc.)',
    type: Number,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoAvaliacaoSelecionada?: number;
}
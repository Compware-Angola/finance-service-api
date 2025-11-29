
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BuscarEstudantesDto {
  @ApiProperty({ example: 131, description: 'Código da grade curricular (obrigatório)' })
  @IsInt()
  @Type(() => Number)
  gradeId: number;

  @ApiProperty({ example: 6, description: 'Tipo de avaliação: 1=Freq, 3=2ªFreq, 6=Exame, 7=Recurso' })
  @IsInt()
  @Type(() => Number)
  tipoAvaliacaoId: number;

  @ApiPropertyOptional({ example: 2, description: 'Tipo de prova (1, 2, etc)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoProvaId?: number;

  @ApiProperty({ example: 23 })
  @IsInt()
  @Type(() => Number)
  anoLectivoId: number;

  @ApiPropertyOptional({ example: 45, description: 'Só se NÃO for por horário' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  turmaId?: number;

  @ApiPropertyOptional({ example: 12, description: 'Só se for por horário' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horarioId?: number;

  @ApiProperty({ example: true, description: 'true = por horário, false = por turma' })
  @IsBoolean()
  @Type(() => Boolean)
  verHorario: boolean;
}
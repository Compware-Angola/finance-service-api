import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsBoolean,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BuscarEstudantesDto {
  // Ano Letivo → form:j_idt62_input = 21
  @ApiProperty({ example: 21, description: 'ID do ano letivo' })
  @IsInt()
  @Type(() => Number)
  anoLectivoId: number;

  // Semestre → form:j_idt66_input = 1
  @ApiProperty({ example: 1, description: 'Semestre (1 ou 2)' })
  @IsInt()
  @IsIn([1, 2], { message: 'Semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;

  // Período → form:periudo_input = 5
  @ApiProperty({ example: 5, description: 'ID do período letivo' })
  @IsInt()
  @Type(() => Number)
  periodo: number;

  // Curso → form:j_idt74_input = 18
  @ApiProperty({ example: 18, description: 'ID do curso' })
  @IsInt()
  @Type(() => Number)
  cursoId: number;

  // Ano Curricular → form:j_idt78_input = 1
  @ApiProperty({ example: 1, description: 'Ano curricular (1º, 2º, etc.)' })
  @IsInt()
  @Type(() => Number)
  anoCurricular: number;

  // Unidade Curricular → form:UcsHorario_input = 2
  @ApiProperty({ example: 2, description: 'ID da unidade curricular (disciplina)' })
  @IsInt()
  @Type(() => Number)
  unidadeCurricularId: number;

  // Tipo de Avaliação / Frequência → form:avaliacao_input = 3
  @ApiProperty({
    example: 3,
    description: 'Tipo de avaliação: 1=Freq, 3=2ªFreq, 6=Exame, 7=Recurso, etc.',
  })
  @IsInt()
  @Type(() => Number)
  tipoAvaliacaoId: number;

  // Tipo de Prova → form:tipoProva_lancamento_nota_input = 7 (opcional)
  @ApiPropertyOptional({
    example: 7,
    description: 'Tipo de prova (ex: 7 pode ser Recurso, etc.)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoProvaId?: number;

  // Horário → form:horarios_input = 0 (0 normalmente significa "todos" ou "sem horário específico")
  @ApiPropertyOptional({
    example: 0,
    description: 'ID do horário (0 = todos / sem filtro de horário)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horarioId?: number;

  // Flag para indicar se é por horário ou por turma
  // (como no teu exemplo original usavas verHorario, mantive o mesmo campo)
  @ApiProperty({
    example: false,
    description: 'true = busca por horário, false = busca por turma',
  })
  @IsBoolean()
  @Type(() => Boolean)
  verHorario: boolean;

  // Turma (opcional - só quando verHorario = false)
  @ApiPropertyOptional({
    example: 45,
    description: 'ID da turma (usado quando verHorario = false)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  turmaId?: number;

  // Grade curricular (se ainda for necessário no teu backend)
  @ApiPropertyOptional({ example: 131, description: 'Código da grade curricular (se aplicável)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gradeId: number;
}
import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query, Put } from '@nestjs/common';
import { AssessmentService, NotaLancadaResponseDto } from './assessment.service';


import { BuscarNotasDto } from './dto/buscar-notas.dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ListarUnidadesCurricularesDto } from './dto/listar-unidades-curriculares.dto';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { AtualizarFormulaDto } from './dto/atualizar-formula.dto';
import { DefinirOralGradeDto } from './dto/definir-oral-grade.dto';
import { ListarDefinirOralDto } from './dto/listar-definir-oral.dto';
import { DefineFormulaUcOralService } from './define_formula_uc_oral.service';
import { AtualizarStatusOralDto } from './dto/atualizar-status-oral.dto';
import { BuscarDisciplinasProvaDto } from './dto/buscar-disciplinas-prova.dto';
import { StudentFiltersDto } from './dto/studenty-filter.dto';
import { NoteReleaseService } from './note_release.service';
import { StudentEvaluationDto } from './dto/student-evaluation.dto';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly noteReleaseService:NoteReleaseService,private readonly service: AssessmentService,private readonly defineFormulaUcService:DefineFormulaUcService,private readonly oralService:DefineFormulaUcOralService) {}
  @Post('upsert')
  @ApiOperation({
    summary: 'Criar ou atualizar uma avaliação do aluno',
    description:
      'Faz um INSERT se a avaliação não existir ou UPDATE se já existir para o mesmo aluno, tipo de prova e época.',
  })
  @ApiResponse({
    status: 200,
    description: 'Avaliação criada ou atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos enviados.',
  })
  async upsertEvaluation(@Body() dto: StudentEvaluationDto) {
    return await this.noteReleaseService.upsertStudentEvaluation(dto);
  }
 @Get('filtrar')
@ApiOperation({ summary: 'Filtrar alunos por critérios específicos' })
@ApiResponse({ status: 200, description: 'Lista de alunos filtrados' })
filtrarAlunos(@Query() filtro: StudentFiltersDto) {
  return this.noteReleaseService.findstudents(filtro);
}

  @Get('disciplinas-prova')
  async buscarDisciplinasProva(
    @Query(ValidationPipe) params: BuscarDisciplinasProvaDto,
  ) {
    return this.service.buscarDisciplinasProva(params);
  }

@Get('notas')
  async buscarNotas(
    @Query(ValidationPipe) params: BuscarNotasDto,
  ): Promise<NotaLancadaResponseDto[]> {
    return this.service.buscarNotas(params.turmaOuHorarioId, params);
  }
  @Get('unidades-curriculares')
@ApiOperation({ summary: 'Listar fórmulas de avaliação por curso, ano e semestre' })
async listarUnidadesCurriculares(
  @Query(ValidationPipe) params: ListarUnidadesCurricularesDto,
) {
  return this.defineFormulaUcService.listarUnidadesCurriculares(params);
}
@Put('unidades-curriculares') // ou @Put
async salvarFormula(@Body() body: AtualizarFormulaDto) {
  return this.defineFormulaUcService.atualizarFormula(body);
}
@Get('definir/oral')
  @ApiOperation({ summary: 'Listar disciplinas com status de oral habilitado' })
  @ApiResponse({ status: 200, type: [DefinirOralGradeDto] })
  async buscar(
    @Query(ValidationPipe) params: ListarDefinirOralDto,
  ): Promise<DefinirOralGradeDto[]> {
    return this.oralService.buscar(params);
  }
  @Patch('definir/oral/status')
@ApiOperation({ summary: 'Habilitar ou desabilitar prova oral para uma disciplina' })
@ApiBody({ type: AtualizarStatusOralDto })
@ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
@ApiResponse({ status: 404, description: 'Disciplina não encontrada' })
async atualizarStatus(
  @Body(ValidationPipe) dto: AtualizarStatusOralDto,
): Promise<{ message: string; habilitar: boolean }> {
  await this.oralService.atualizarStatus(dto);
  return {
    message: 'Status da oral atualizado com sucesso',
    habilitar: dto.habilitar,
  };
}
}

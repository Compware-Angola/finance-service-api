import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query, Put } from '@nestjs/common';
import { AssessmentService, NotaLancadaResponseDto } from './assessment.service';

import { BuscarDisciplinasProvaDto } from './dto/buscar-disciplinas-prova.dto';
import { BuscarNotasDto } from './dto/buscar-notas.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ListarUnidadesCurricularesDto } from './dto/listar-unidades-curriculares.dto';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { AtualizarFormulaDto } from './dto/atualizar-formula.dto';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly service: AssessmentService,private readonly defineFormulaUcService:DefineFormulaUcService) {}



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
}

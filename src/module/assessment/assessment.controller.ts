import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query } from '@nestjs/common';
import { AssessmentService, NotaLancadaResponseDto } from './assessment.service';

import { BuscarDisciplinasProvaDto } from './dto/buscar-disciplinas-prova.dto';
import { BuscarNotasDto } from './dto/buscar-notas.dto';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}



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
}

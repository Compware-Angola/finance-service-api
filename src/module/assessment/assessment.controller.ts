import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { BuscarDisciplinasProvaDto } from './dto/buscar-disciplinas-prova.dto';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}



  @Get('disciplinas-prova')
  async buscarDisciplinasProva(
    @Query(ValidationPipe) params: BuscarDisciplinasProvaDto,
  ) {
    return this.service.buscarDisciplinasProva(params);
  }
}

import { Controller, Get, ValidationPipe, Query, Req } from '@nestjs/common';
import { DisciplineService } from './discipline.service';

import { ApiOperation } from '@nestjs/swagger';
import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';

@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}
  @Get()
  @ApiOperation({
    summary: 'Listar disciplinas matriculadas do aluno',
  })
  findGradeCurricularAluno(
    @Query(ValidationPipe) query: FindDisciplinaAlunoDTO,
    @Req() req: any,
  ) {
    return this.disciplineService.findGradeCurricularAluno(query);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AlunoService } from './aluno.service';
import { FindMovimentoContaEstudanteDTO } from './dto/find-movimento-conta-estudante.dto';

@ApiTags('Alunos')
@Controller('alunos')
export class AlunoController {
  constructor(private readonly alunoService: AlunoService) {}

  @Get('/:codigo')
  @ApiOperation({
    summary: 'Buscar aluno pelo código da matrícula',
    description:
      'Retorna os dados do aluno associado à matrícula informada. ' +
      'Se o aluno estiver diplomado retorna 400. ' +
      'Se a matrícula não existir retorna 404.',
  })
  @ApiParam({
    name: 'codigo',
    type: Number,
    example: 260,
    description: 'Código da matrícula',
  })
  @ApiOkResponse({
    description: 'Aluno encontrado com sucesso',
    schema: {
      example: {
        codigo_matricula: 260,
        bi: '00654789LA042',
        curso: 'Engenharia Informática',
        periodo: 'Laboral',
        estado: 'ATIVO',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Aluno diplomado',
    schema: {
      example: {
        statusCode: 400,
        message: 'Aluno diplomado',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Matrícula não encontrada',
    schema: {
      example: {
        statusCode: 404,
        message: 'Matrícula não encontrada',
        error: 'Not Found',
      },
    },
  })
  async findAlunoByMatricula(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.alunoService.findAlunoByMatriculaCodigo({
      codigo,
    });
  }
  @Get('/preinscricao/:codigo')
  @ApiParam({
    name: 'codigo',
    type: Number,
    example: 260,
    description: 'Código da matrícula',
  })
  async findAlunoPreInscricaoByMatricula(
    @Param('codigo', ParseIntPipe) codigo: number,
  ) {
    return this.alunoService.findAlunoPreinscricaoByMatricula(codigo);
  }

  @Get('/:codigoMatricula/movimentos')
  @ApiParam({
    name: 'codigoMatricula',
    type: Number,
    example: 260,
    description: 'Código da matrícula',
  })
  async findMovimentoContaEstudante(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
    @Query() findMovimentoContaEstudanteDTO: FindMovimentoContaEstudanteDTO,
  ) {
    return this.alunoService.findMovimentoContaEstudante(
      codigoMatricula,
      findMovimentoContaEstudanteDTO,
    );
  }
  @Get('/:codigoMatricula/saldo')
  @ApiParam({
    name: 'codigoMatricula',
    type: Number,
    example: 260,
    description: 'Código da matrícula',
  })
  async findSaldoContaEstudante(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
  ) {
    return this.alunoService.findSaldoContaEstudante(codigoMatricula);
  }
}

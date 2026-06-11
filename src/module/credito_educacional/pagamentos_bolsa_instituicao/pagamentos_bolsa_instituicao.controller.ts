import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { FindPagamentoBolsaDto } from './dto/find-pagamento-bolsa.dto';
import { FindEstudantesPorBolsaDto } from './dto/find-estudantes-por-bolsa.dto';
import { PagamentosBolsaInstituicaoService } from './pagamentos_bolsa_instituicao.service';
import { CreatePagamentosBolsaInstituicaoDto } from './dto/create-pagamentos_bolsa_instituicao.dto';
import { UpdatePagamentosBolsaInstituicaoDto } from './dto/update-pagamentos_bolsa_instituicao.dto';

@ApiTags('Pagamentos de Bolsas por Instituição')
@ApiBearerAuth()
@Controller('pagamentos-bolsa')
export class PagamentoBolsaController {
  constructor(private readonly service: PagamentosBolsaInstituicaoService) { }

  // ──────────────────────────────────────────────────────────────
  // CRUD BÁSICO
  // ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Registar novo pagamento de bolsa por instituição' })
  create(@Body() dto: CreatePagamentosBolsaInstituicaoDto, @Req() req: any) {
    const codigoUtilizador = req.user?.codigo ?? req.user?.sub ?? 0;
    return this.service.create(dto, codigoUtilizador);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os pagamentos (com filtros)',
    description:
      'Suporta filtros por bolsa, instituição, ano lectivo, semestre, estado e nome de instituição. ' +
      'Use apenasSemPagamento=1 para ver apenas bolsas sem pagamento registado.',
  })
  findAll(@Query() query: FindPagamentoBolsaDto) {
    return this.service.findAll(query);
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obter detalhe de um pagamento pelo código' })
  @ApiParam({ name: 'codigo', type: Number })
  findOne(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.findOne(codigo);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Actualizar um pagamento' })
  @ApiParam({ name: 'codigo', type: Number })
  update(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdatePagamentosBolsaInstituicaoDto,
    @Req() req: any,
  ) {
    const codigoUtilizador = req.user?.codigo ?? req.user?.sub ?? 0;
    return this.service.update(codigo, dto, codigoUtilizador);
  }

  @Delete(':codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover (soft-delete) um pagamento' })
  @ApiParam({ name: 'codigo', type: Number })
  remove(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.remove(codigo);
  }

  @Patch(':codigo/toggle-estado')
  @ApiOperation({ summary: 'Activar / inactivar um pagamento' })
  @ApiParam({ name: 'codigo', type: Number })
  toggleEstado(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.toggleEstado(codigo);
  }

  // ──────────────────────────────────────────────────────────────
  // CONCILIAÇÃO / DASHBOARD
  // ──────────────────────────────────────────────────────────────

  @Get('conciliacao/resumo')
  @ApiOperation({
    summary: 'Resumo de conciliação por instituição',
    description:
      'Devolve o valor depositado vs esperado por instituição, divergência percentual, ' +
      'status de conciliação e métricas de insights (para os cards do dashboard).',
  })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number })
  @ApiQuery({ name: 'semestre', required: false, type: Number })
  resumoConciliacao(
    @Query('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Query('semestre') semestre?: string,
  ) {
    return this.service.resumoPorInstituicao(
      anoLectivo,
      semestre ? Number(semestre) : undefined,
    );
  }

  @Get('conciliacao/sem-pagamento')
  @ApiOperation({
    summary: 'Instituições sem pagamento registado',
    description:
      'Lista instituições que têm bolsas activas mas ainda não efectuaram nenhum depósito ' +
      'no período indicado.',
  })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number })
  @ApiQuery({ name: 'semestre', required: false, type: Number })
  semPagamento(
    @Query('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Query('semestre') semestre?: string,
  ) {
    return this.service.instituicoesSemPagamento(
      anoLectivo,
      semestre ? Number(semestre) : undefined,
    );
  }

  // ──────────────────────────────────────────────────────────────
  // ESTUDANTES
  // ──────────────────────────────────────────────────────────────

  @Get('bolsa/:codigoBolsa/estudantes')
  @ApiOperation({
    summary: 'Listar estudantes de uma bolsa específica',
    description:
      'Devolve todos os bolseiros associados a uma bolsa. Filtrável por ano lectivo, ' +
      'semestre, nome, curso e status do bolseiro.',
  })
  @ApiParam({ name: 'codigoBolsa', type: Number })
  estudantesPorBolsa(
    @Param('codigoBolsa', ParseIntPipe) codigoBolsa: number,
    @Query() query: FindEstudantesPorBolsaDto,
  ) {
    return this.service.estudantesPorBolsa(codigoBolsa, query);
  }

  @Get('instituicao/:codigoInstituicao/estudantes')
  @ApiOperation({
    summary: 'Listar todos os estudantes bolseiros de uma instituição',
    description:
      'Agrega todos os bolseiros de todas as bolsas da instituição. ' +
      'Útil para ver o total de estudantes subsidiados pela instituição.',
  })
  @ApiParam({ name: 'codigoInstituicao', type: Number })
  estudantesPorInstituicao(
    @Param('codigoInstituicao', ParseIntPipe) codigoInstituicao: number,
    @Query() query: FindEstudantesPorBolsaDto,
  ) {
    return this.service.estudantesPorInstituicao(codigoInstituicao, query);
  }
  @Get('conciliacao/insights')
  @ApiOperation({
    summary: 'Insights financeiros da conciliação',
    description:
      'Devolve os cards de insights: instituição com maior valor recebido, com mais bolseiros, ' +
      'nº com divergências ≥ 5%, crescimento vs período anterior, tendência de custos e ' +
      'saúde geral da conciliação.',
  })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number })
  @ApiQuery({ name: 'semestre', required: false, type: Number })
  insightsConciliacao(
    @Query('anoLectivo', ParseIntPipe) anoLectivo: number,
    @Query('semestre') semestre?: string,
  ) {
    return this.service.insights(
      anoLectivo,
      semestre ? Number(semestre) : undefined,
    );
  }
  // ──────────────────────────────────────────────────────────────
  // HISTÓRICO
  // ──────────────────────────────────────────────────────────────

  @Get('bolsa/:codigoBolsa/historico')
  @ApiOperation({
    summary: 'Histórico de todos os pagamentos de uma bolsa',
    description:
      'Mostra todos os pagamentos registados para uma bolsa ao longo dos anos lectivos.',
  })
  @ApiParam({ name: 'codigoBolsa', type: Number })
  historicoPorBolsa(
    @Param('codigoBolsa', ParseIntPipe) codigoBolsa: number,
  ) {
    return this.service.historicoPorBolsa(codigoBolsa);
  }
}
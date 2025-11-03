// src/debt-negotiation/debt-negotiation.controller.ts
import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  BadRequestException,
  Post,
  Body,
  ParseIntPipe,
  Param,
} from '@nestjs/common';

import { GetDebtDto } from './dto/get-debt.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DebtNegotiationService } from './debt_negotiation.service';
import { CreateDebtNegotiationDto } from './dto/create-debt_negotiation.dto';
import { CreateDebtNegotiationService } from './debt.create.service';

@ApiTags('Negociação de Dívidas')
@ApiBearerAuth()
@Controller('debt-negotiation')
export class DebtNegotiationController {
  constructor(
    private readonly debtNegotiationService: DebtNegotiationService,
    private readonly createDebtNegotiationService: CreateDebtNegotiationService,
  ) { }

  @Post(':codigo_matricula')
  @ApiOperation({ summary: 'Criar negociação de dívidas' })
  @ApiParam({
    name: 'codigo_matricula',
    type: 'integer',
    description: 'Código da matrícula do aluno',
    example: 12345,
  })
  @ApiResponse({
    status: 201,
    description: 'Negociação de dívidas criada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async createDebtNegotiation(
    @Param('codigo_matricula', ParseIntPipe) codigo_matricula: number,
    @Body(ValidationPipe) dto: CreateDebtNegotiationDto,
  ) {
    return this.createDebtNegotiationService.createDebtNegotiation(
      dto,
      codigo_matricula,
    );
  }


  @Get()
  @ApiOperation({ summary: 'Obter dívidas pendentes do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Dívidas retornadas com sucesso',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async getDebt(@Query(ValidationPipe) query: GetDebtDto) {
    const { matricula, preinscricaoId, tipoCandidatura } = query;

    // Validação extra (opcional)
    if (!matricula || !preinscricaoId) {
      throw new BadRequestException('matricula e preinscricaoId são obrigatórios');
    }

    return this.debtNegotiationService.getDebt(
      matricula,
      preinscricaoId,
      tipoCandidatura
    );
  }
}
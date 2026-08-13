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
import { CreateDebtNegotiationService } from './negotation.create.service';
import { NegotiationService } from './negotiation.service';
import { GetDebtDtoNew } from './dto/find-debit.dto';

@ApiTags('Negociação de Dívidas')
@ApiBearerAuth()
@Controller('debt-negotiation')
export class DebtNegotiationController {
  constructor(
    private readonly debtNegotiationService: DebtNegotiationService,
    private readonly createDebtNegotiationService: CreateDebtNegotiationService,
    private readonly negotiationService: NegotiationService,
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
  @ApiResponse({ status: 400, "description": 'Parâmetros inválidos' })
  @ApiResponse({ status: 404, "description": 'Aluno não encontrado' })
  async createDebtNegotiation(
    @Param('codigo_matricula', ParseIntPipe) codigo_matricula: number,
    @Body(ValidationPipe) dto: CreateDebtNegotiationDto,
  ) {
    return this.createDebtNegotiationService.createDebtNegotiation(
      dto,
      codigo_matricula,
    );
  }




  @Get("get-debts-information")
  @ApiOperation({ summary: 'Obter dívidas pendentes do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Dívidas retornadas com sucesso',
    type: Object,
  })
  @ApiResponse({ status: 400, "description": 'Parâmetros inválidos' })
  @ApiResponse({ status: 404, "description": 'Aluno não encontrado' })
  async getDebtsInformation(@Query(ValidationPipe) query: GetDebtDtoNew) {
    return this.negotiationService.getAllDebtNegotiations(query)
  }
}
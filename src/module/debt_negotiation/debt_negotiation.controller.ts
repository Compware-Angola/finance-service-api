// src/debt-negotiation/debt-negotiation.controller.ts
import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';

import { GetDebtDto } from './dto/get-debt.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DebtNegotiationService } from './debt_negotiation.service';

@ApiTags('Negociação de Dívidas')
@ApiBearerAuth()
@Controller('debt-negotiation')
export class DebtNegotiationController {
  constructor(
    private readonly debtNegotiationService: DebtNegotiationService,
  ) {}

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
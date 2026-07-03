import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';

import { CashRegistersService } from './cash-registers.service';
import { CashRegisterSummaryService } from './cash-register-summary.service';

import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';

import { ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from 'src/common/helpers/access-log.helper';

import {
  ListCashRegistersDto,
  ListCashRegistersForOpeningDto,
} from './dto/list-cash-registers.dto';

import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { ListOperatorsDto } from './dto/list-operators.dto';
import { VerifyMyCashRegisterDto } from './dto/verify-my-cash-register.dto';
import { ListCashRegisterMovementsDto } from './dto/ist-movements.dto';
import { ValidateMovementDto } from './dto/validate-movement.dto';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { PaymentReportDto } from './dto/payment-report.dto';
type Action =
  | 'CRIAR'
  | 'ATUALIZAR'
  | 'ELIMINAR'
  | 'ABRIR'
  | 'FECHAR'
  | 'VALIDAR'
  | 'BLOQUEAR'
  | 'RECUPERAR'
  | 'VERIFICAR';

@ApiTags('caixas')
@Controller('cash-registers')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class CashRegistersController {
  constructor(
    private readonly cashRegistersService: CashRegistersService,
    private readonly summaryService: CashRegisterSummaryService,
    private readonly httpService: HttpService,
  ) { }

  // =====================================================
  // LISTAR
  // =====================================================
  @Get()
  async findAll(@Query() query: ListCashRegistersDto) {
    return await this.cashRegistersService.findAll(query);
  }

  // =====================================================
  // CRIAR
  // =====================================================
  @Post()
  async create(@Body() body: CreateCashRegisterDto, @Req() req: any) {
    const user = req.user;

    const cashRegister = await this.cashRegistersService.create(body, user.sub);

    this.log(req, user, 'CRIAR', 'CAIXA', {
      id: cashRegister.id,
      nome: body.name,
    });

    return {
      data: cashRegister,
      message: 'Caixa criado com sucesso',
    };
  }

  // =====================================================
  // ATUALIZAR
  // =====================================================
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCashRegisterDto,
    @Req() req: any,
  ) {
    const user = req.user;

    const cashRegister = await this.cashRegistersService.update(
      Number(id),
      body,
      user.sub,
    );

    this.log(req, user, 'ATUALIZAR', 'CAIXA', {
      id,
      nome: body.name,
    });

    return {
      data: cashRegister,
      message: 'Caixa atualizado com sucesso',
    };
  }

  // =====================================================
  // ELIMINAR
  // =====================================================
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const user = req.user;

    const result = await this.cashRegistersService.delete(Number(id), user.sub);

    this.log(req, user, 'ELIMINAR', 'CAIXA', {
      id,
    });

    return result;
  }

  // =====================================================
  // ABRIR
  // =====================================================
  @Patch(':id/open')
  async open(
    @Param('id') id: string,
    @Body() body: OpenCashRegisterDto,
    @Req() req: any,
  ) {
    const user = req.user;

    const cashRegister = await this.cashRegistersService.open({
      id: Number(id),
      operatorId: body.operatorId,
      openingAmount: body.openingAmount ?? 0,
      adminId: user.sub,
    });

    this.log(req, user, 'ABRIR', 'CAIXA', {
      id,
      openingAmount: body.openingAmount,
    });

    return {
      data: cashRegister,
    };
  }

  // =====================================================
  // FECHAR
  // =====================================================
  @Patch(':id/close')
  async close(@Param('id') id: string, @Req() req: any) {
    const user = req.user;

    const response = await this.cashRegistersService.close(
      Number(id),
      user.sub,
    );

    this.log(req, user, 'FECHAR', 'CAIXA', { id });

    return {
      data: response,
    };
  }

  @Get('movements')
  async findMovements(@Query() query: ListCashRegisterMovementsDto) {
    return await this.cashRegistersService.findMovements(query);
  }

  // =====================================================
  // MOVIMENTOS - VALIDAR
  // =====================================================
  @Patch('movements/:id/validate')
  async validate(
    @Param('id') id: string,
    @Body() body: ValidateMovementDto,
    @Req() req: any,
  ) {
    await this.cashRegistersService.validateMovement({
      id: Number(id),
      ...body,
    });

    this.log(req, req.user, 'VALIDAR', 'MOVIMENTO', {
      movementId: id,
      action: body.action,
    });

    return { message: 'Movimento validado com sucesso' };
  }

  // =====================================================
  // OPERADORES
  // =====================================================
  @Get('operators/available')
  async listAvailableOperators(@Query() query: ListOperatorsDto) {
    return await this.cashRegistersService.listAvailableOperators(query);
  }

  // =====================================================
  // MEU CAIXA
  // =====================================================
  @Get('me')
  async findMyOpenCashRegister(@Req() req: any) {
    return {
      data: await this.cashRegistersService.findOpenByOperatorId(req.user.sub),
    };
  }

  @Get('me/summary')
  async getMySummary(@Req() req: any) {
    return {
      data: await this.summaryService.getMySummary(req.user.sub),
    };
  }

  // =====================================================
  // RECUPERAR CÓDIGO
  // =====================================================
  @Patch('me/recovery-code')
  async recoveryOpeningCode(@Req() req: any) {
    const user = req.user;

    const result = await this.cashRegistersService.recoveryOpeningCode(
      user.sub,
    );

    this.log(req, user, 'RECUPERAR', 'CÓDIGO DE ABERTURA');
    return result;
  }

  // =====================================================
  // BLOQUEAR
  // =====================================================
  @Patch('me/block')
  async blockMyCashRegister(@Req() req: any) {
    const user = req.user;

    const result = await this.cashRegistersService.blockMyCashRegister(
      user.sub,
    );

    this.log(req, user, 'BLOQUEAR', 'CAIXA PRÓPRIO');

    return result;
  }

  // =====================================================
  // DISPONÍVEIS
  // =====================================================
  @Get('available')
  async findAvailableForOpening(
    @Query() query: ListCashRegistersForOpeningDto,
  ) {
    return {
      data: await this.cashRegistersService.findAvailableForOpening(
        query.search,
      ),
    };
  }

  // =====================================================
  // VERIFICAR CÓDIGO
  // =====================================================
  @Post('me/verify-opening-code')
  async verifyMyCashRegister(
    @Req() req: any,
    @Body() body: VerifyMyCashRegisterDto,
  ) {
    const user = req.user;

    const result = await this.cashRegistersService.verifyMyCashRegister({
      openingCode: body.openingCode,
      operatorId: user.sub,
    });

    this.log(req, user, 'VERIFICAR', 'CÓDIGO DE ABERTURA');

    return result;
  }

  @Get('reports/:operatorId')
  async findPaymentReportsForOperator(
    @Param('operatorId', ParseIntPipe) operatorId: number,
    @Query() query: PaymentReportDto,
  ) {
    return this.summaryService.findPaymentReportsForOperator(operatorId, query);
  }

  // =====================================================
  // LOGGER CENTRAL
  // =====================================================
  private log(
    req: any,
    user: any,
    action: Action,
    entity: string,
    meta?: Record<string, any>,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const message = this.buildLogMessage(user, action, entity, meta);

    AccessLogHelper.logAccess(this.httpService, {
      descricao: message,
      fkUtilizadorResponsavel: user?.sub,
      ip,
    });
  }

  private buildLogMessage(
    user: any,
    action: Action,
    entity: string,
    meta?: Record<string, any>,
  ) {
    const base = `UTILIZADOR ${user?.nome}`;

    switch (action) {
      case 'CRIAR':
        return `${base} CRIOU ${entity}${meta?.id ? ` (id: ${meta.id}, nome: ${meta.name})` : ''}`;

      case 'ATUALIZAR':
        return `${base} ATUALIZOU ${entity}${meta?.id ? ` (id: ${meta.id}, nome: ${meta.name})` : ''}`;

      case 'ELIMINAR':
        return `${base} ELIMINOU ${entity}${meta?.id ? ` (id: ${meta.id})` : ''}`;

      case 'ABRIR':
        return `${base} ABRIU ${entity}${meta?.id ? ` (id: ${meta.id})` : ''
          }${meta?.openingAmount ? ` (valor: ${meta.openingAmount})` : ''}`;

      case 'FECHAR':
        return `${base} FECHOU ${entity}${meta?.id ? ` (id: ${meta.id})` : ''}`;

      case 'VALIDAR':
        return `${base} VALIDOU ${entity}${meta?.movementId ? ` (movement: ${meta.movementId})` : ''
          }`;

      case 'BLOQUEAR':
        return `${base} BLOQUEOU ${entity}`;

      case 'RECUPERAR':
        return `${base} RECUPEROU ${entity}`;

      case 'VERIFICAR':
        return `${base} VERIFICOU ${entity}`;

      default:
        return `${base} EXECUTOU ${action} EM ${entity}`;
    }
  }
}

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
} from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';

import {
  ListCashRegistersDto,
  ListCashRegistersForOpeningDto,
} from './dto/list-cash-registers.dto';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from 'src/common/helpers/access-log.helper';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CashRegisterSummaryService } from './cash-register-summary.service';
import { ListOperatorsDto } from './dto/list-operators.dto';
import { VerifyMyCashRegisterDto } from './dto/verify-my-cash-register.dto';
import { ListCashRegisterMovementsDto } from './dto/ist-movements.dto';
import { ValidateMovementDto } from './dto/validate-movement.dto';
@ApiTags('caixas')
@Controller('cash-registers')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class CashRegistersController {
  constructor(
    private readonly cashRegistersService: CashRegistersService,
    private readonly summaryService: CashRegisterSummaryService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async findAll(@Query() query: ListCashRegistersDto) {
    return await this.cashRegistersService.findAll(query);
  }
  @Get('movements')
  async findMovements(@Query() query: ListCashRegisterMovementsDto) {
    return await this.cashRegistersService.findMovements(query);
  }

  @Patch('/movements/:id/validate')
  async validate(
    @Param('id') id: string,
    @Body() body: ValidateMovementDto,
    @Req() req: any,
  ) {
    await this.cashRegistersService.validateMovement({
      id: Number(id),
      ...body,
    });
    this.log(req, req.user, 'validou o fechamento de caixa');
    return { message: 'fechamento de caixa validado com sucesso' };
  }

  @Get('operators/available')
  async listAvailableOperators(@Query() query: ListOperatorsDto) {
    return await this.cashRegistersService.listAvailableOperators(query);
  }

  @Get('me')
  async findMyOpenCashRegister(@Req() req: any) {
    return {
      data: await this.cashRegistersService.findOpenByOperatorId(req.user.sub),
    };
  }
  @Get('me/summary')
  async getMySummary(@Req() req: any) {
    console.log(req.user);
    return {
      data: await this.summaryService.getMySummary(req.user.sub),
    };
  }

  @Get('available')
  async findAvailableForOpening(
    @Query()
    query: ListCashRegistersForOpeningDto,
  ) {
    return {
      data: await this.cashRegistersService.findAvailableForOpening(
        query.search,
      ),
    };
  }

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

    return {
      data: cashRegister,
    };
  }

  @Patch(':id/close')
  async close(@Param('id') id: string, @Req() req: any) {
    const user = req.user;

    const response = await this.cashRegistersService.close(
      Number(id),
      user.sub,
    );
    this.log(req, user, `fechou o caixa ${id}`);
    return {
      data: response,
    };
  }
  @Post('me/verify-opening-code')
  async verifyMyCashRegister(
    @Req() req: any,
    @Body() body: VerifyMyCashRegisterDto,
  ) {
    const user = req.user;
    return await this.cashRegistersService.verifyMyCashRegister({
      openingCode: body.openingCode,
      operatorId: user.sub,
    });
  }

  private log(req: any, user: any, descricao: string) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} ${descricao}`,
      fkUtilizadorResponsavel: user?.sub,
      ip,
    });
  }
}

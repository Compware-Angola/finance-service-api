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
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';

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
@ApiTags('caixas')
@Controller('caixas')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class CashRegistersController {
  constructor(
    private readonly cashRegistersService: CashRegistersService,
    private readonly summaryService: CashRegisterSummaryService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async findAll(@Query() query: ListCashRegistersDto) {
    return {
      data: await this.cashRegistersService.findAll(query),
    };
  }
  @Get('me')
  async findMyOpenCashRegister(@Req() req: any) {
    return {
      data: await this.cashRegistersService.findOpenByOperatorId(req.user.sub),
    };
  }
  @Get('me/resumo')
  async getMySummary(@Req() req: any) {
    console.log(req.user);
    return {
      data: await this.summaryService.getMySummary(req.user.sub),
    };
  }
  @Get('disponiveis')
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

  @Patch(':id/abrir')
  async open(
    @Param('id') id: string,
    @Body() body: OpenCashRegisterDto,
    @Req() req: any,
  ) {
    const user = req.user;

    const cashRegister = await this.cashRegistersService.open({
      id: Number(id),
      operatorId: user.sub,
      openingAmount: body.openingAmount ?? 0,
      adminId: user.sub,
    });

    this.log(req, user, `abriu o caixa ${id}`);

    return {
      data: cashRegister,
    };
  }

  @Patch(':id/close')
  async close(@Param('id') id: string, @Req() req: any) {
    const user = req.user;

    await this.cashRegistersService.close(Number(id), user.sub);

    this.log(req, user, `fechou o caixa ${id}`);

    return {
      message: 'Caixa fechado com sucesso',
    };
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

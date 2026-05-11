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

import { ListCashRegistersDto } from './dto/list-cash-registers.dto';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { AccessLogHelper } from 'src/common/helpers/access-log.helper';
@ApiTags('caixas')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('caixas')
export class CashRegistersController {
  constructor(
    private readonly service: CashRegistersService,
    private httpService: HttpService,
  ) {}

  @Post()
  async create(@Body() body: CreateCashRegisterDto, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cashRegister = await this.service.create(body);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} criou um caixa`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
    return { data: cashRegister };
  }

  @Get()
  async findAll(@Query() query: ListCashRegistersDto) {
    return { data: await this.service.findAll(query) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const cashRegister = await this.service.findOne(Number(id));
    return { data: cashRegister };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCashRegisterDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cashRegister = await this.service.update(Number(id), body);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} atualizou o caixa com código ${id}`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
    return { data: cashRegister };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cashRegister = await this.service.remove(Number(id));
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} removeu o caixa com código ${id}`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
    return { data: cashRegister };
  }

  @Patch(':id/open/')
  async open(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const cashRegister = await this.service.openCashRegister(
      Number(id),
      user?.sub,
    );
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} abriu o caixa com código ${id}`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
    return { data: cashRegister };
  }

  @Patch(':id/close')
  async close(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await this.service.closeCashRegister(Number(id), user?.sub);
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} fechou o caixa com código ${id}`,
      fkUtilizadorResponsavel: user?.sub,
      ip: ip,
    });
    return { message: 'Caixa fechado com sucesso' };
  }

  @Get('meu-caixa')
  async findByOperatorId(@Req() req: any) {
    const user = req.user;
    const cashRegister = await this.service.findCashRegisterOpenByOperatorId(
      user?.sub,
    );
    return { data: cashRegister };
  }
}

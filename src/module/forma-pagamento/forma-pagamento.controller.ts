import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FormaPagamentoService } from './forma-pagamento.service';

import { CreateFormaPagamentoDto } from './dto/create-forma-pagamento.dto';
import { UpdateFormaPagamentoDto } from './dto/update-forma-pagamento.dto';
import { FilterFormaPagamentoDto } from './dto/filter-forma-pagamento.dto';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';

@ApiTags('Forma Pagamento')
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('forma-pagamento')
export class FormaPagamentoController {
  constructor(private readonly service: FormaPagamentoService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar forma de pagamento',
  })
  @ApiResponse({
    status: 201,
    description: 'Forma de pagamento criada com sucesso',
  })
  create(
    @Body()
    body: CreateFormaPagamentoDto,
  ) {
    return this.service.create(body);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar formas de pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de formas de pagamento',
  })
  findAll(
    @Query()
    filters: FilterFormaPagamentoDto,
  ) {
    return this.service.findAll(filters);
  }

  @Get(':codigo')
  @ApiOperation({
    summary: 'Buscar forma de pagamento por código',
  })
  @ApiParam({
    name: 'codigo',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Forma de pagamento encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Forma de pagamento não encontrada',
  })
  findOne(
    @Param('codigo', ParseIntPipe)
    codigo: number,
  ) {
    return this.service.findOne(codigo);
  }

  @Put(':codigo')
  @ApiOperation({
    summary: 'Atualizar forma de pagamento',
  })
  @ApiParam({
    name: 'codigo',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Forma de pagamento atualizada com sucesso',
  })
  update(
    @Param('codigo', ParseIntPipe)
    codigo: number,

    @Body()
    body: UpdateFormaPagamentoDto,
  ) {
    return this.service.update(codigo, body);
  }

  @Patch(':codigo/toggle-status')
  @ApiOperation({
    summary: 'Ativar ou desativar forma de pagamento',
  })
  @ApiParam({
    name: 'codigo',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado alterado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Forma de pagamento não encontrada',
  })
  toggleStatus(
    @Param('codigo', ParseIntPipe)
    codigo: number,
  ) {
    return this.service.toggleStatus(codigo);
  }
}

// sigla-tipo-servicos.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SiglaTipoServicosService } from './siglas-service.service';
import { CreateSiglaTipoServicoDto } from './dto/create-siglas-service.dto';
import { UpdateSiglaTipoServicoDto } from './dto/update-siglas-service.dto';

@Controller('sigla-tipo-servicos')
export class SiglaTipoServicosController {
  constructor(private readonly service: SiglaTipoServicosService) {}

  @Post()
  create(@Body() dto: CreateSiglaTipoServicoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':codigo')
  findOne(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.findOne(codigo);
  }

  @Patch(':codigo')
  update(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdateSiglaTipoServicoDto,
  ) {
    return this.service.update(codigo, dto);
  }

  @Delete(':codigo')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.remove(codigo);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,

  ParseIntPipe,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common'

import { CreateTipoCreditoDto, FilterTipoCreditoDto } from './dto/create-tipo_credito.dto'
import { UpdateTipoCreditoDto } from './dto/update-tipo_credito.dto'
import { TipoCreditoService } from './tipo_credito.service'
import { ApiQuery } from '@nestjs/swagger'

@Controller('tipos-credito')
export class TipoCreditoController {
  constructor(private readonly service: TipoCreditoService) { }

  @Post()
  create(@Body() dto: CreateTipoCreditoDto) {
    return this.service.create(dto)
  }

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens por página (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filtra tipos de crédito que contenham este texto na designação',
  })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    const dto: FilterTipoCreditoDto = {
      page,
      limit,
      search,
    }
    return this.service.findAll(dto)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoCreditoDto,
  ) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id)
  }
}

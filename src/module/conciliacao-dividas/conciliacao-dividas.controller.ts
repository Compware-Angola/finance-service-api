import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConciliacaoDividasService } from './conciliacao-dividas.service';
import { CreateConciliacaoDividaDto } from './dto/create-conciliacao-divida.dto';
import { UpdateConciliacaoDividaDto } from './dto/update-conciliacao-divida.dto';

@Controller('conciliacao-dividas')
export class ConciliacaoDividasController {
  constructor(private readonly conciliacaoDividasService: ConciliacaoDividasService) { }

  @Post()
  create(@Body() createConciliacaoDividaDto: CreateConciliacaoDividaDto) {
    return this.conciliacaoDividasService.create(createConciliacaoDividaDto);
  }


}

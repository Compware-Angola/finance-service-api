import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BolsaService } from './bolsa.service';
import { CreateBolsaDto } from './dto/create-bolsa.dto';
import { UpdateBolsaDto } from './dto/update-bolsa.dto';
import { FindBolsaDto } from './dto/find-bolsa.dto';

@Controller('bolsa')
export class BolsaController {
  constructor(private readonly bolsaService: BolsaService) { }

  @Post()
  create(@Body() createBolsaDto: CreateBolsaDto) {
    return this.bolsaService.create(createBolsaDto);
  }

  @Get()
  findAll(@Query() dto: FindBolsaDto) {
    return this.bolsaService.findAll(dto);
  }

}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { BolsaService } from './bolsa.service';
import { CreateBolsaDto } from './dto/create-bolsa.dto';
import { UpdateBolsaDto } from './dto/update-bolsa.dto';
import { FindBolsaDto } from './dto/find-bolsa.dto';
import { FindBolsaDropdownDto } from './dto/find-bolsa-dropdown.dto';

@Controller('bolsa')
export class BolsaController {
  constructor(private readonly bolsaService: BolsaService) {}

  @Post()
  create(@Body() createBolsaDto: CreateBolsaDto) {
    const codigoUtilizador = 1;
    return this.bolsaService.create(createBolsaDto, codigoUtilizador);
  }

  @Get()
  findAll(@Query() dto: FindBolsaDto) {
    return this.bolsaService.findAll(dto);
  }
  @Get('dropdown')
  findDropdown(@Query() dto: FindBolsaDropdownDto) {
    return this.bolsaService.findDropdown(dto);
  }
  @Put(':id')
  update(@Param('id') id: number, @Body() updateBolsaDto: UpdateBolsaDto) {
    const codigoUtilizador = 1;
    return this.bolsaService.update(id, updateBolsaDto, codigoUtilizador);
  }

  @Patch(':id/switch')
  switchStatus(@Param('id') id: number) {
    const codigoUtilizador = 1;
    return this.bolsaService.switchStatus(id, codigoUtilizador);
  }
}

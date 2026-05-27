import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Put, Query } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreateCreditoEducacionalDto } from './dto/create-credito_educacional.dto';

import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { UpdateCreditoEducacionalDto } from './dto/update-credito_educacional.dto';
import { FindCreditoEducacionalDto } from './dto/find-credito-educacional.dto';

@Controller('credito-educacional')
export class CreditoEducacionalController {
  constructor(private readonly creditoEducacionalService: CreditoEducacionalService) { }
  // @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createCreditoEducacionalDto: CreateCreditoEducacionalDto, @Req() req: any) {

    const codigoUtilizador = 1;
    return this.creditoEducacionalService.create(createCreditoEducacionalDto, codigoUtilizador);
  }
  @Get()
  findAll(@Query() findCreditoEducacionalDto: FindCreditoEducacionalDto) {
    return this.creditoEducacionalService.findAll(findCreditoEducacionalDto);
  }
  @Put(':id')
  update(@Param('id') id: number, @Body() updateCreditoEducacionalDto: UpdateCreditoEducacionalDto, @Req() req: any) {
    const codigoUtilizador = 1;
    return this.creditoEducacionalService.update(id, updateCreditoEducacionalDto, codigoUtilizador);
  }
  @Patch(':id/switch')
  switchBolseiro(@Param('id') id: number) {
    return this.creditoEducacionalService.switchBolseiro(id);
  }
  @Get('dados-info')
  getInfoBolseiroDados(@Query('codigoMatricula') codigoMatricula: number) {
    return this.creditoEducacionalService.getInfoBolseiroDados(codigoMatricula);
  }
}

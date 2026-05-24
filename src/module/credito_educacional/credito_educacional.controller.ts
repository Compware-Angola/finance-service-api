import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreateCreditoEducacionalDto } from './dto/create-credito_educacional.dto';

import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';

@Controller('credito-educacional')
export class CreditoEducacionalController {
  constructor(private readonly creditoEducacionalService: CreditoEducacionalService) { }
  // @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createCreditoEducacionalDto: CreateCreditoEducacionalDto, @Req() req: any) {

    const codigoUtilizador = 1;
    return this.creditoEducacionalService.create(createCreditoEducacionalDto, codigoUtilizador);
  }


}

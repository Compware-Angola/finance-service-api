import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SharedService } from './shared.service';

@Controller('shared')
export class SharedController {
  constructor(private readonly sharedService: SharedService) { }

  @Get('polo-dropdown')
  findPoloDropdown() {
    return this.sharedService.findPoloDropdown();
  }
  @Get('tipo-taxa-dropdown')
  findTipoTaxaDropdown() {
    return this.sharedService.findTipoTaxaDropdown();
  }
  @Get('motivo-isencao-dropdown')
  findMotivoIsencaoDropdown() {
    return this.sharedService.findMotivoIsencaoDropdown();
  }
}

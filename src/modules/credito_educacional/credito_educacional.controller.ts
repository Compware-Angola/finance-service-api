import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreateCreditoEducacionalDto } from './dto/create-credito_educacional.dto';

import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { UpdateCreditoEducacionalDto } from './dto/update-credito_educacional.dto';
import { FindCreditoEducacionalDto } from './dto/find-credito-educacional.dto';
import { ValidarEstudanteCreditoDto } from './dto/validar-estudante-credito.dto';
import { HttpExportHelper } from 'src/common/helpers/export/http-export.helper';

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

  @Get('export')
  async exportCreditoEducacional(
    @Query() findCreditoEducacionalDto: FindCreditoEducacionalDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamCsv(
      response,
      'estudantes-credito-educacional',
      this.creditoEducacionalService.exportCreditoEducacional(
        findCreditoEducacionalDto,
      ),
    );
  }

  @Get('export/pdf')
  async exportCreditoEducacionalPdf(
    @Query() findCreditoEducacionalDto: FindCreditoEducacionalDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamPdf(
      response,
      'estudantes-credito-educacional',
      (document) =>
        this.creditoEducacionalService.writeCreditoEducacionalPdf(
          findCreditoEducacionalDto,
          document,
        ),
    );
  }

  @Get('export/excel')
  async exportCreditoEducacionalExcel(
    @Query() findCreditoEducacionalDto: FindCreditoEducacionalDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamExcel(
      response,
      'estudantes-credito-educacional',
      () =>
        this.creditoEducacionalService.writeCreditoEducacionalExcel(
          findCreditoEducacionalDto,
        ),
    );
  }

  @Get('estudante/validar')
  validarEstudante(@Query() query: ValidarEstudanteCreditoDto) {
    return this.creditoEducacionalService.validarEstudanteParaCredito(query);
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
  @Patch(':id/toggle-instituicao-pagou')
  toggleInstituicaoPagou(@Param('id') id: number) {
    return this.creditoEducacionalService.toggleInstituicaoPagou(id);
  }
}

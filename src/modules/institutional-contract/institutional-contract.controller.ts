import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { InstitutionalContractService } from './institutional-contract.service';
import { CreateContratoBolsaDto } from './dto/CreateContratoBolsaDto';
import { UpdateContratoBolsaDto } from './dto/UpdateContratoBolsaDto';
import {
  ContratoBolsaEstatisticasQueryDto,
  ListContratoBolsaQueryDto,
} from './dto/ListContratoBolsaQueryDto';
import { HttpExportHelper } from 'src/common/helpers/export/http-export.helper';

@Controller('institutional-contract')
export class InstitutionalContractController {
  constructor(
    private readonly institutionalContractService: InstitutionalContractService,
  ) {}

  @Post()
  create(@Body() createInstitutionalContractDto: CreateContratoBolsaDto) {
    return this.institutionalContractService.createContratoBolsa(
      createInstitutionalContractDto,
    );
  }

  @Get()
  findAll(@Query() findInstitutionalContractDto: ListContratoBolsaQueryDto) {
    return this.institutionalContractService.listarContratosBolsa(
      findInstitutionalContractDto,
    );
  }

  @Get('export')
  async exportContratoBolsa(
    @Query() findInstitutionalContractDto: ListContratoBolsaQueryDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamCsv(
      response,
      'contratos-credito-educacional',
      this.institutionalContractService.exportContratoBolsa(
        findInstitutionalContractDto,
      ),
    );
  }

  @Get('export/pdf')
  async exportContratoBolsaPdf(
    @Query() findInstitutionalContractDto: ListContratoBolsaQueryDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamPdf(
      response,
      'contratos-credito-educacional',
      (document) =>
        this.institutionalContractService.writeContratoBolsaPdf(
          findInstitutionalContractDto,
          document,
        ),
    );
  }

  @Get('export/excel')
  async exportContratoBolsaExcel(
    @Query() findInstitutionalContractDto: ListContratoBolsaQueryDto,
    @Res() response: Response,
  ) {
    await HttpExportHelper.streamExcel(
      response,
      'contratos-credito-educacional',
      () =>
        this.institutionalContractService.writeContratoBolsaExcel(
          findInstitutionalContractDto,
        ),
    );
  }

  @Get('estatisticas')
  async getEstatisticas(@Query() query: ContratoBolsaEstatisticasQueryDto) {
    return this.institutionalContractService.obterEstatisticasContratosBolsa(
      query,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateInstitutionalContractDto: UpdateContratoBolsaDto,
  ) {
    return this.institutionalContractService.editarContratoBolsa(
      id,
      updateInstitutionalContractDto,
    );
  }
  @Patch(':id/estado')
  async alternarEstado(@Param('id', ParseIntPipe) id: number) {
    return this.institutionalContractService.alternarEstadoContratoBolsa(id);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.institutionalContractService.deleteContratoBolsa(+id);
  }
}

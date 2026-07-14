import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InstitutionalContractService } from './institutional-contract.service';
import { CreateContratoBolsaDto } from './dto/CreateContratoBolsaDto';
import { UpdateContratoBolsaDto } from './dto/UpdateContratoBolsaDto';
import { FindCreditoEducacionalDto } from '../credito_educacional/dto/find-credito-educacional.dto';
import { ListContratoBolsaQueryDto } from './dto/ListContratoBolsaQueryDto';

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

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.institutionalContractService.deleteContratoBolsa(+id);
  }
}

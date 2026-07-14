import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InstitutionalContractService } from './institutional-contract.service';
import { CreateInstitutionalContractDto } from './dto/create-institutional-contract.dto';
import { UpdateInstitutionalContractDto } from './dto/update-institutional-contract.dto';

@Controller('institutional-contract')
export class InstitutionalContractController {
  constructor(private readonly institutionalContractService: InstitutionalContractService) {}

  @Post()
  create(@Body() createInstitutionalContractDto: CreateInstitutionalContractDto) {
    return this.institutionalContractService.create(createInstitutionalContractDto);
  }

  @Get()
  findAll() {
    return this.institutionalContractService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionalContractService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInstitutionalContractDto: UpdateInstitutionalContractDto) {
    return this.institutionalContractService.update(+id, updateInstitutionalContractDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.institutionalContractService.remove(+id);
  }
}

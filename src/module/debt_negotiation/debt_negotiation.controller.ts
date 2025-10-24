import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DebtNegotiationService } from './debt_negotiation.service';
import { CreateDebtNegotiationDto } from './dto/create-debt_negotiation.dto';
import { UpdateDebtNegotiationDto } from './dto/update-debt_negotiation.dto';

@Controller('debt-negotiation')
export class DebtNegotiationController {
  constructor(private readonly debtNegotiationService: DebtNegotiationService) {}

  @Post()
  create(@Body() createDebtNegotiationDto: CreateDebtNegotiationDto) {
    return this.debtNegotiationService.create(createDebtNegotiationDto);
  }

  @Get()
  findAll() {
    return this.debtNegotiationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.debtNegotiationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDebtNegotiationDto: UpdateDebtNegotiationDto) {
    return this.debtNegotiationService.update(+id, updateDebtNegotiationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.debtNegotiationService.remove(+id);
  }
}

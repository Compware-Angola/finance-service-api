import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe } from '@nestjs/common';
import { ExemptDaysService } from './exempt_days.service';
import { CreateExemptDayDto } from './dto/create-exempt_day.dto';
import { UpdateExemptDayDto } from './dto/update-exempt_day.dto';

@Controller('exempt-days')
export class ExemptDaysController {
  constructor(private readonly exemptDaysService: ExemptDaysService) {}

 
 @Put(':codigo')
async update(
  @Param('codigo', ParseIntPipe) codigo: number,
  @Body() dto: UpdateExemptDayDto,
) {
  return this.exemptDaysService.updateExemptDay(codigo, dto);
}
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exemptDaysService.deleteExemptDay(+id);
  }
}

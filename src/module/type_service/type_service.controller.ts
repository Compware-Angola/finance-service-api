import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Put,
} from '@nestjs/common';
import { ServicoProcessado, TypeServiceService } from './type_service.service';
import { CreateTypeServiceDto } from './dto/create-type_service.dto';
import { UpdateTypeServiceDto } from './dto/update-type_service.dto';
import { FilterTypeServiceDto } from './dto/filter-type-service.dto';
import { FilterTypeServiceAllDto } from './dto/filter-type-service-all.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ListServiceByYearDto } from './dto/ListServiceByYearDto';
import { CreateTypeServiceMassDto } from './dto/CreateTypeServiceMassDto';

@Controller('type-service')
export class TypeServiceController {
  constructor(private readonly typeServiceService: TypeServiceService) { }
  @Get()
  findTipoServicosDropdown(@Query() filters: FilterTypeServiceDto) {
    return this.typeServiceService.findTipoServicosDropdown(filters);
  }
  @Get('list-by-year')
  @ApiOperation({
    summary: 'Lista serviços por ano lectivo',
  })
  listByAnoLectivo(@Query() query: ListServiceByYearDto) {
    return this.typeServiceService.listByAnoLectivo(query);
  }
  @Post('mass')
  async createMass(
    @Body() createDto: CreateTypeServiceMassDto,
  ): Promise<{
    cadastrados: ServicoProcessado[];
    duplicados: ServicoProcessado[];
  }> {
    return this.typeServiceService.createMass(createDto);
  }
  @Get('all')
  findTipoServicos(@Query() filters: FilterTypeServiceAllDto) {
    return this.typeServiceService.findTipoServicos(filters);
  }
  @Get('monthly-fee')
  findTipoMonthlyFee(@Query() filters: FilterTypeServiceAllDto) {
    return this.typeServiceService.findTipoMonthlyFee(filters);
  }

  @Post()
  create(@Body() createDto: CreateTypeServiceDto) {
    return this.typeServiceService.create(createDto);
  }

  @Put(':codigo')
  update(
    @Param('codigo') codigo: number,
    @Body() updateDto: UpdateTypeServiceDto,
  ) {
    return this.typeServiceService.update(codigo, updateDto);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TypeServiceService } from './type_service.service';
import { CreateTypeServiceDto } from './dto/create-type_service.dto';
import { UpdateTypeServiceDto } from './dto/update-type_service.dto';
import { FilterTypeServiceDto } from './dto/filter-type-service.dto';

@Controller('type-service')
export class TypeServiceController {
  constructor(private readonly typeServiceService: TypeServiceService) {}
@Get()
findTipoServicosDropdown(@Query() filters: FilterTypeServiceDto) {
  return this.typeServiceService.findTipoServicosDropdown(filters);
}

}

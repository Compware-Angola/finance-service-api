import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { IsencaoService } from './isencao.service';
import { CreateIsencaoDto } from './dto/create-isencao.dto';
import { UpdateIsencaoDto } from './dto/update-isencao.dto';
import { FilterIsencaoDto } from './dto/filter-isencao.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('isencao')
@Controller('isencao')
export class IsencaoController {
  constructor(private readonly isencaoService: IsencaoService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova isenção' })
  create(@Body() createDto: CreateIsencaoDto) {
    return this.isencaoService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar isenções' })
  findAll(@Query() filters: FilterIsencaoDto) {
    return this.isencaoService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de isenção' })
  findOne(@Param('id') id: number) {
    return this.isencaoService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar isenção' })
  update(@Param('id') id: number, @Body() updateDto: UpdateIsencaoDto) {
    return this.isencaoService.update(id, updateDto);
  }
}

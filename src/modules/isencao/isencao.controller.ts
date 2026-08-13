import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Req,
} from '@nestjs/common';
import { IsencaoService } from './isencao.service';
import { CreateIsencaoDto } from './dto/create-isencao.dto';
import { UpdateIsencaoDto } from './dto/update-isencao.dto';
import { FilterIsencaoDto } from './dto/filter-isencao.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateIsencaoMesalidadeDto } from './dto/create-isencao-mentalidade.dto';
import { IsencaoServiceMulta } from './isencao-multa.service';
import { CreateIsencaoMultaDTO } from './dto/create-isencao-multa.dto';
import { FindIsencaoMultaDTO } from './dto/find-isencao-muta.dto';

@ApiTags('isencao')
@Controller('isencao')
export class IsencaoController {
  constructor(
    private readonly isencaoService: IsencaoService,
    private readonly isencaoMultaService: IsencaoServiceMulta,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova isenção' })
  create(@Body() createDto: CreateIsencaoDto) {
    return this.isencaoService.create(createDto);
  }
  @Post('/mensalidade')
  @ApiOperation({ summary: 'Criar nova isenção mensalidade' })
  createMensalidade(@Body() createMensalidadeDto: CreateIsencaoMesalidadeDto) {
    return this.isencaoService.isentarMensalidade(createMensalidadeDto);
  }
  @Post('/multa')
  @ApiOperation({ summary: 'Criar nova isenção mensalidade' })
  id(@Body() createIsencaoMulta: CreateIsencaoMultaDTO, @Req() req: any) {
    //const user = req.user;
    //user.sub
    return this.isencaoMultaService.isentarMulta(createIsencaoMulta, 653);
  }

  @Get()
  @ApiOperation({ summary: 'Listar isenções' })
  findAll(@Query() filters: FilterIsencaoDto) {
    return this.isencaoService.findAll(filters);
  }
  @Get('/multas')
  @ApiOperation({ summary: 'Listar isenções multa' })
  findIsencaoMulta(@Query() filters: FindIsencaoMultaDTO) {
    return this.isencaoMultaService.findIsencaoMulta(filters);
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

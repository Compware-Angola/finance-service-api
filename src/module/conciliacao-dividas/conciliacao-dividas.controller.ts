import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConciliacaoDividasService } from './conciliacao-dividas.service';
import { CreateConciliacaoDividaDto } from './dto/create-conciliacao-divida.dto';
import { ValidarConciliacaoDividaDto } from './dto/validar-conciliacao-divida.dto';
import { FindConciliacaoDividaDto } from './dto/find-conciliacao-divida.dto';

@ApiTags('Conciliação de Dívidas')
@Controller('conciliacao-dividas')
export class ConciliacaoDividasController {
  constructor(private readonly service: ConciliacaoDividasService) { }

  @Post()
  create(@Body() dto: CreateConciliacaoDividaDto, @Req() req: any) {
    // const userId = req.user.sub;
    return this.service.create(dto, 1);
  }

  @Patch(':id/validar')
  validar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidarConciliacaoDividaDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.service.validar(id, dto, 1);
  }

  @Get()
  findAll(@Query() filter: FindConciliacaoDividaDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
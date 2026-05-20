import { Controller, Get, Query } from '@nestjs/common';

import { UtilizadorService } from './utilizador.service';
import { ApiTags } from '@nestjs/swagger';
import { ListUtilizadorDto } from './dto/list-utilizador.dto';

@ApiTags('utilizadores')
@Controller('utilizadores')
export class UtilizadorController {
  constructor(private readonly utilizadorService: UtilizadorService) {}

  @Get()
  list(@Query() query: ListUtilizadorDto) {
    return this.utilizadorService.list(query);
  }
}

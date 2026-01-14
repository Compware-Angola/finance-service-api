
import {
  ApiTags,

  ApiBearerAuth,

} from '@nestjs/swagger';

import { GetDebtNegotiationFilterDto } from './dto/find-deb-negotation.dto';
import { ListDebtNegotiationService } from './list_debt_negotiation.service';
import { Controller, Get, Query } from '@nestjs/common';


@ApiTags('Negociação de Dívidas')
@ApiBearerAuth()
@Controller('debt-negotiation')
export class ListDebtNegotiationController {
  constructor(
    private readonly listdebtNegotiationService: ListDebtNegotiationService,
 
  ) { }
@Get('list')
async listNegotiations(@Query() filter: GetDebtNegotiationFilterDto) {
  return this.listdebtNegotiationService.findNegotiations(filter);
}
}
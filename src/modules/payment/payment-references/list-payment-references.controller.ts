import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ListPaymentRefenceService } from './list-payment-references.service';
import { GetPaymentRefenceFilterDto } from './dto/get-payment-referenc-filter.dto';

@ApiTags('REFERÊNCIAS DE PAGAMENTO')
@Controller('/payment-references')
export class ListPaymentRefenceController {
  constructor(private readonly service: ListPaymentRefenceService) {}

  @Get('list')
  @ApiOperation({ summary: 'Lista faturas com filtros opcionais e paginação' })
  async list(@Query() filter: GetPaymentRefenceFilterDto) {
    return this.service.list(filter);
  }
}

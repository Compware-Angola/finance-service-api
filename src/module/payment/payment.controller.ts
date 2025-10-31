import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Payment } from './entities/payment.entity';
import { PagedResult } from 'src/common/dto/pagination-result.dto';

@ApiTags('payment') 
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('get/:academicYear/:preInscritionCode')
  @ApiOperation({ 
    summary: 'Lista pagamentos por Ano Lectivo e Código de Pré-Inscrição, com paginação.' 
  })
  @ApiResponse({ status: 200, description: 'Lista de pagamentos filtrada e paginada.' })
  async findByAnoLectivoAndPreInscricao(
    @Param('academicYear', ParseIntPipe) academicYear: number,
    @Param('preInscritionCode', ParseIntPipe) preInscritionCode: number,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PagedResult<Payment>> {
    return this.paymentService.findInvoicesAndItemsDetailedFlat(
      academicYear,
      preInscritionCode,
      paginationQuery,
    );
  }
}
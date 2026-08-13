import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { MonthlyFeesFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-filter.dto';
import { MonthlyFeesStatisticFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-statistic.dto';


@Controller('financial/monthly-fees')
export class MonthlyFeesController {
  constructor(private readonly monthlyFeesService: MonthlyFeesService) { }

  @Get()

  async getPaginatedFees(@Query() filterQuery: MonthlyFeesFilterDto) {
    return this.monthlyFeesService.findMonthlyFees(filterQuery);
  }
  @Get('/statistic')
  async getStatistic(@Query() filtersQuery: MonthlyFeesStatisticFilterDto) {
    return this.monthlyFeesService.findMonthlyStatistic(filtersQuery);
  }

  @Patch('/recalculate-payments/:codFactura')
  async recalculatePayments(@Param('codFactura') codFactura: number) {
    return this.monthlyFeesService.recalculatePayments(codFactura);
  }


  @Patch('/ajustar-fatura-parcial/:codigo_matricula/:mes_temp_id/:ano_lectivo')
  async ajustarFaturaParcial(
    @Param('codigo_matricula') codigo_matricula: number,
    @Param('mes_temp_id') mes_temp_id: number,
    @Param('ano_lectivo') ano_lectivo: number,
    @Body('valor_ja_pago') valor_ja_pago: number,
    @Body('observacao') observacao?: string,
  ) {
    return this.monthlyFeesService.ajustarFaturaParcial({
      codigo_matricula,
      mes_temp_id,
      ano_lectivo,
      valor_ja_pago,
      observacao,
    });
  }
}

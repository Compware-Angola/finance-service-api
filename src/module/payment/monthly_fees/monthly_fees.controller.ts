import {
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
}

import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MonthlyFeesFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-filter.dto'; // Novo DTO
import { MonthlyFeesStatisticFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-statistic.dto';
import { TestMonthlyDTO } from '../../shared/monthly_fees/dto/test-monthly.dto';
// ... outros imports ...

@Controller('financial/monthly-fees')
export class MonthlyFeesController {
  constructor(private readonly monthlyFeesService: MonthlyFeesService) { }

  @Get()
  // ... decoradores Swagger ...
  async getPaginatedFees(@Query() filterQuery: MonthlyFeesFilterDto) {
    return this.monthlyFeesService.findMonthlyFees(filterQuery);
  }
  @Get('/statistic')
  async getStatistic(@Query() filtersQuery: MonthlyFeesStatisticFilterDto) {
    return this.monthlyFeesService.findMonthlyStatistic(filtersQuery);
  }
}

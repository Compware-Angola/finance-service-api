import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { MonthlyFeesService } from './monthly_fees.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { MonthlyFeesFilterDto } from './dto/monthly-fees-filter.dto'; // Novo DTO
// ... outros imports ...

@Controller('monthly-fees')
export class MonthlyFeesController {
  constructor(private readonly monthlyFeesService: MonthlyFeesService) {}

  @Get()
  // ... decoradores Swagger ...
  async getPaginatedFees(
    @Query() filterQuery: MonthlyFeesFilterDto,
  ) {
    
    return this.monthlyFeesService.findMonthlyFees(filterQuery);
  }
}
import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PaymentStaticsService } from "./payment-statics.service";
import { PaymentMonthlySummaryDto } from "./dto/payment-monthly-summary.dto";
import { PaymentSummaryResponseDto } from "./dto/payment-summary-response.dto";
import { PaymentDailySummaryDto } from "./dto/payment-daily-summary.dto";
import { PaymentServiceComparisonDto, PaymentServiceComparisonResponseDto } from "./dto/payment-comparison.dto";
import { PaymentPerformanceMonthlyDto } from "./dto/payment-performance-monthly.dto";

@ApiTags('payment')
@Controller('payment/statics')
export class PaymentStaticsController {
  constructor(
    private readonly paymentStaticsService: PaymentStaticsService,
  ) { }

  @Get('summary/daily')
  @ApiOkResponse({
    description: 'Resumo dos pagamentos realizados no dia corrente',
    type: PaymentSummaryResponseDto,
  })
  async getPaymentDailySummary(
    @Query() query: PaymentDailySummaryDto,
  ) {
    return this.paymentStaticsService.getPaymentDailySummary(query);
  }


  @Get('summary/monthly')
  @ApiOkResponse({
    description: 'Resumo dos pagamentos por mês',
    type: PaymentSummaryResponseDto,
  })
  async getPaymentMonthlySummary(
    @Query() query: PaymentMonthlySummaryDto,
  ) {
    return this.paymentStaticsService.getPaymentMonthlySummary(query);
  }

  @Get('summary/comparison')
  @ApiOkResponse({
    description: 'Comparação entre Propinas e Outros Serviços.',
    type: PaymentServiceComparisonResponseDto,
    isArray: true,
  })
  async getPaymentServiceComparison(
    @Query() query: PaymentServiceComparisonDto,
  ) {
    return this.paymentStaticsService.getPaymentServiceComparison(
      query,
    );
  }

  @Get('summary/performance/monthly')
  @ApiOkResponse({
    description: 'Curva mensal de pagamentos de propinas.',
  })
  async getPaymentPerformanceMonthly(
    @Query() query: PaymentPerformanceMonthlyDto,
  ) {

    return this.paymentStaticsService
      .getPaymentPerformanceMonthly(query);

  }
}
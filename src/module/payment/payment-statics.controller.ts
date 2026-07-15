import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PaymentStaticsService } from "./payment-statics.service";
import { PaymentServiceComparisonDto, PaymentServiceComparisonResponseDto } from "./dto/payment-comparison.dto";
import { PaymentPerformanceMonthlyDto } from "./dto/payment-performance-monthly.dto";
import { PaymentSummaryDto, PaymentSummaryResponseDto } from "./dto/payment-summary.dto";

@ApiTags('payment')
@Controller('payment/statics')
export class PaymentStaticsController {
  constructor(
    private readonly paymentStaticsService: PaymentStaticsService,
  ) { }

  @Get('summary')
  @ApiOkResponse({
    description: 'Resumo de pagamentos agrupados por forma de pagamento.',
    type: PaymentSummaryResponseDto,
    isArray: true,
  })
  async getPaymentSummary(
    @Query() query: PaymentSummaryDto,
  ) {
    const data = await this.paymentStaticsService.getPaymentSummary(query);
    return { data }

  }

  @Get('summary/comparison')
  @ApiOkResponse({
    description: 'Comparação entre Propinas e Outros Serviços.',
    type: PaymentServiceComparisonResponseDto,
    isArray: true,
  })

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
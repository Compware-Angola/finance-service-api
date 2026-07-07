import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PaymentStaticsService } from "./payment-statics.service";
import { PaymentMonthlySummaryDto } from "./dto/payment-monthly-summary.dto";
import { PaymentSummaryResponseDto } from "./dto/payment-summary-response.dto";
import { PaymentDailySummaryDto } from "./dto/payment-daily-summary.dto";

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
}
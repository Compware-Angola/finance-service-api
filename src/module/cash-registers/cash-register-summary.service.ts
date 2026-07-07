import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CashRegistersService } from './cash-registers.service';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { InjectRepository } from '@nestjs/typeorm';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';
import { CashRegisterStatus } from './enums/cash-register-status.enum';
import { buildPaymentReportCountQuery, buildPaymentReportQuery, buildPaymentReportWhereClause } from './query-builder/payment-report.query-builder';
import { PaymentReportDto } from './dto/payment-report.dto';
import { PaymentAnalyticsService } from './payment-analytics.service';

@Injectable()
export class CashRegisterSummaryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cashRegistersService: CashRegistersService,
    @InjectRepository(CashRegisterMovement)
    private readonly movementRepository: Repository<CashRegisterMovement>,
    private readonly paymentAnalyticsService: PaymentAnalyticsService,
  ) { }

  async getPaymentMethodSummary(params: {
    operatorId: number;
    cashRegisterId: number;
  }) {
    const { operatorId, cashRegisterId } = params;
    const cashRegister = await this.movementRepository.findOne({
      where: {
        cashRegisterId,
        operatorId,
        status: CashRegisterStatus.OPEN,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new BadRequestException('Caixa não encontrado');
    }
    const summary = await this.paymentAnalyticsService.getDailySummary({
      operatorId,
      cashRegisterId,
      date: cashRegister.createdAt,
    });

    return {
      summary,
      openingAmount: cashRegister.openingAmount ?? 0,
      movementID: cashRegister.id,
    };
  }

  async getMySummary(operatorId: number) {
    const cashRegister =
      await this.cashRegistersService.validateOperatorOpenCashRegister(
        operatorId,
      );

    if (!cashRegister) {
      return null;
    }

    return this.getPaymentMethodSummary({
      operatorId,
      cashRegisterId: cashRegister.id,
    });
  }

  async findPaymentReportsForOperator(
    userId: number,
    filters: PaymentReportDto,
  ) {
    const {
      page = 1,
      limit = 10,
    } = filters;

    const offset = (page - 1) * limit;

    const { clauses, params } =
      buildPaymentReportWhereClause(filters, userId);

    const whereClause =
      clauses.length > 0
        ? clauses.join(" AND ")
        : "1=1";

    const [rows, count] = await Promise.all([
      this.dataSource.query(
        buildPaymentReportQuery(whereClause),
        {
          ...params,
          offset,
          limit,
        } as any,
      ),
      this.dataSource.query(
        buildPaymentReportCountQuery(whereClause),
        params as any,
      ),
    ]);

    const total = Number(count[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(rows),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

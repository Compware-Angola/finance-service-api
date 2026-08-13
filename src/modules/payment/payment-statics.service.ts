import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PaymentServiceComparisonDto } from "./dto/payment-comparison.dto";
import { buildPaymentServiceComparisonQuery, buildPaymentServiceComparisonWhereClause } from "./query-builder/payment-comparison.query-builder";
import { PaymentPerformanceMonthlyDto } from "./dto/payment-performance-monthly.dto";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { buildPaymentPerformanceMonthlyQuery, buildPaymentPerformanceYearlyTotalsQuery } from "./query-builder/payment-performance-monthly.query";
import { PaymentSummaryDto } from "./dto/payment-summary.dto";
import { buildPaymentSummaryQuery, buildPaymentSummaryWhereClause } from "./query-builder/payment-summary.query-builder";

@Injectable()
export class PaymentStaticsService {
    constructor(
        private readonly dataSource: DataSource,
    ) { }

    async getPaymentSummary(query: PaymentSummaryDto) {
        const {
            clauses,
            params,
        } = buildPaymentSummaryWhereClause(query);

        const result = await this.dataSource.query<{ CODIGO_FORMA_PAGAMENTO: number; TIPO_PAGAMENTO: string; TOTAL_PAGAMENTOS: number; TOTAL_PAGO: number; }[]>(
            buildPaymentSummaryQuery(
                clauses.join(' AND '),
            ),
            params as any,
        );

        return result.map((item) => ({
            codigoFormaPagamento: Number(item.CODIGO_FORMA_PAGAMENTO),
            tipoPagamento: item.TIPO_PAGAMENTO,
            totalPagamentos: Number(item.TOTAL_PAGAMENTOS),
            totalPago: Number(item.TOTAL_PAGO),
        }));
    }

    async getPaymentServiceComparison(
        query: PaymentServiceComparisonDto,
    ) {

        const {
            clauses,
            params,
        } = buildPaymentServiceComparisonWhereClause(query);

        const result = await this.dataSource.query(
            buildPaymentServiceComparisonQuery(
                clauses.join(' AND '),
            ),
            params as any,
        );

        return result.map((item) => ({
            label: item.LABEL,
            totalPayments: Number(item.TOTAL_PAGAMENTOS),
            totalAmount: Number(item.TOTAL),
        }));
    }

    async getPaymentPerformanceMonthly(
        query: PaymentPerformanceMonthlyDto,
    ) {
        const params = {
            anoAtual: query.currentYear,
            anoAnterior: query.previousYear,
        } as any;

        const [monthlyResult, yearlyTotalsResult] = await Promise.all([
            this.dataSource.query(
                buildPaymentPerformanceMonthlyQuery(),
                params,
            ),
            this.dataSource.query(
                buildPaymentPerformanceYearlyTotalsQuery(),
                params,
            ),
        ]);

        const totais = toLowerCaseKeys(yearlyTotalsResult)[0] ?? null;

        return {
            mensal: toLowerCaseKeys(monthlyResult),
            totalAnual: totais && {
                anoAtual: {
                    label: totais.label_ano_atual,
                    totalValor: totais.total_valor_ano_atual,
                    totalPagamentos: totais.total_pagamentos_ano_atual,
                },
                anoAnterior: {
                    label: totais.label_ano_anterior,
                    totalValor: totais.total_valor_ano_anterior,
                    totalPagamentos: totais.total_pagamentos_ano_anterior,
                },
            },
        };
    }
}



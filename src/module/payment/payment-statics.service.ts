import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PaymentMonthlySummaryDto } from "./dto/payment-monthly-summary.dto";

import { PaymentDailySummaryDto } from "./dto/payment-daily-summary.dto";
import { buildPaymentDailySummaryQuery, buildPaymentDailySummaryWhereClause } from "./query-builder/payment-daily-summary.query-builder";
import { buildPaymentMonthlySummaryQuery, buildPaymentMonthlySummaryWhereClause } from "./query-builder/payment-monthly-summary.query-builder";
import { PaymentServiceComparisonDto } from "./dto/payment-comparison.dto";
import { buildPaymentServiceComparisonQuery, buildPaymentServiceComparisonWhereClause } from "./query-builder/payment-comparison.query-builder";
import { PaymentPerformanceMonthlyDto } from "./dto/payment-performance-monthly.dto";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { buildPaymentPerformanceMonthlyQuery, buildPaymentPerformanceYearlyTotalsQuery } from "./query-builder/payment-performance-monthly.query";



@Injectable()
export class PaymentStaticsService {
    constructor(
        private readonly dataSource: DataSource,
    ) { }

    async getPaymentDailySummary(query: PaymentDailySummaryDto) {
        const { clauses, params } = buildPaymentDailySummaryWhereClause(query);
        const whereClause =
            clauses.length > 0
                ? clauses.join(" AND ")
                : "1=1";
        const [summary] = await this.dataSource.query(
            buildPaymentDailySummaryQuery(whereClause),
            {
                ...params
            } as any
        );

        return {
            totalPayments: Number(summary.TOTAL_PAGAMENTOS),
            totalCollected: Number(summary.TOTAL_ARRECADADO),
            averagePayment: Number(summary.VALOR_MEDIO),
            smallestPayment: Number(summary.MENOR_PAGAMENTO),
            largestPayment: Number(summary.MAIOR_PAGAMENTO),
        };
    }

    async getPaymentMonthlySummary(
        query: PaymentMonthlySummaryDto,
    ) {

        const {
            clauses,
            params,
        } = buildPaymentMonthlySummaryWhereClause(query);


        const [summary] = await this.dataSource.query(
            buildPaymentMonthlySummaryQuery(
                clauses.join(' AND '),
            ),
            params as any,
        );


        return {
            totalPayments: Number(summary.TOTAL_PAGAMENTOS),
            totalCollected: Number(summary.TOTAL_ARRECADADO),
            averagePayment: Number(summary.VALOR_MEDIO),
            smallestPayment: Number(summary.MENOR_PAGAMENTO),
            largestPayment: Number(summary.MAIOR_PAGAMENTO),
        };
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



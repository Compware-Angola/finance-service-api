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
        const result = await this.dataSource.query(
            `WITH meses AS (
    SELECT 
        MOD(LEVEL + 8, 12) + 1 AS mes,
        LEVEL AS ordem
    FROM dual
    CONNECT BY LEVEL <= 10
),
anos AS (
    SELECT
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAtual)    AS label_ano_atual,
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAnterior) AS label_ano_anterior
    FROM dual
)
SELECT
    meses.mes,
    TRIM(
        TO_CHAR(
            TO_DATE(meses.mes, 'MM'),
            'Month',
            'NLS_DATE_LANGUAGE=PORTUGUESE'
        )
    ) AS nome_mes,

    anos.label_ano_atual,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = :anoAtual
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0) AS valor_ano_atual,

    anos.label_ano_anterior,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = :anoAnterior
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0) AS valor_ano_anterior

FROM meses
CROSS JOIN anos
LEFT JOIN FK2_TB_PAGAMENTOS pagamentos
    ON EXTRACT(MONTH FROM pagamentos.CREATED_AT) = meses.mes
    AND pagamentos.STATUS_PAGAMENTO = 'concluido'
    AND pagamentos.ANOLECTIVO IN (:anoAtual, :anoAnterior)

GROUP BY
    meses.mes,
    meses.ordem,
    anos.label_ano_atual,
    anos.label_ano_anterior

ORDER BY
    meses.ordem`,
            { anoAtual: query.currentYear, anoAnterior: query.previousYear } as any,
        );
        return toLowerCaseKeys(result)
    }
}



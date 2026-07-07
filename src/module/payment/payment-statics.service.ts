import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PaymentMonthlySummaryDto } from "./dto/payment-monthly-summary.dto";

import { PaymentDailySummaryDto } from "./dto/payment-daily-summary.dto";
import { buildPaymentDailySummaryQuery, buildPaymentDailySummaryWhereClause } from "./query-builder/payment-daily-summary.query-builder";

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

    async getPaymentMonthlySummary(query: PaymentMonthlySummaryDto) {
        const { year, month } = query;
        const [summary] = await this.dataSource.query(
            `
    SELECT
        COUNT(*) AS TOTAL_PAGAMENTOS,
        NVL(SUM(VALOR_DEPOSITADO), 0) AS TOTAL_ARRECADADO,
        NVL(AVG(VALOR_DEPOSITADO), 0) AS VALOR_MEDIO,
        NVL(MIN(VALOR_DEPOSITADO), 0) AS MENOR_PAGAMENTO,
        NVL(MAX(VALOR_DEPOSITADO), 0) AS MAIOR_PAGAMENTO
    FROM FK2_TB_PAGAMENTOS
    WHERE STATUS_PAGAMENTO = 'concluido'
      AND CREATED_AT >= TRUNC(
            TO_DATE(
                NVL(:year, TO_CHAR(SYSDATE, 'YYYY')) || '-' ||
                LPAD(NVL(:month, TO_CHAR(SYSDATE, 'MM')), 2, '0') || '-01',
                'YYYY-MM-DD'
            ),
            'MM'
        )
      AND CREATED_AT < ADD_MONTHS(
            TRUNC(
                TO_DATE(
                    NVL(:year, TO_CHAR(SYSDATE, 'YYYY')) || '-' ||
                    LPAD(NVL(:month, TO_CHAR(SYSDATE, 'MM')), 2, '0') || '-01',
                    'YYYY-MM-DD'
                ),
                'MM'
            ),
            1
        )
    `,
            {
                month,
                year,
            } as any,
        );

        return {
            totalPayments: Number(summary.TOTAL_PAGAMENTOS),
            totalCollected: Number(summary.TOTAL_ARRECADADO),
            averagePayment: Number(summary.VALOR_MEDIO),
            smallestPayment: Number(summary.MENOR_PAGAMENTO),
            largestPayment: Number(summary.MAIOR_PAGAMENTO),
        };
    }
}
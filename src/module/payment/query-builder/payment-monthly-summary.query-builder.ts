import { PaymentMonthlySummaryDto } from "../dto/payment-monthly-summary.dto";

export const BASE_JOINS_PAYMENT_MONTHLY_SUMMARY = ``;

export const buildPaymentMonthlySummaryWhereClause = (
    filters: PaymentMonthlySummaryDto,
) => {
    const clauses: string[] = [
        `pagamentos.STATUS_PAGAMENTO = 'concluido'`,
        `
    pagamentos.CREATED_AT >= TRUNC(
      TO_DATE(
        NVL(:year, TO_CHAR(SYSDATE, 'YYYY')) || '-' ||
        LPAD(NVL(:month, TO_CHAR(SYSDATE, 'MM')), 2, '0') || '-01',
        'YYYY-MM-DD'
      ),
      'MM'
    )
    `,
        `
    pagamentos.CREATED_AT < ADD_MONTHS(
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
    ];

    const params: Record<string, any> = {
        month: filters.month ?? null,
        year: filters.year ?? null,
    };


    if (filters.formaPagamento) {
        clauses.push(
            `pagamentos.FORMA_PAGAMENTO = :formaPagamento`,
        );

        params.formaPagamento = filters.formaPagamento.toString();
    }


    return {
        clauses,
        params,
    };
};


export const buildPaymentMonthlySummaryQuery = (
    whereClause: string,
) => `
SELECT
    COUNT(*) AS TOTAL_PAGAMENTOS,
    NVL(SUM(pagamentos.VALOR_DEPOSITADO), 0) AS TOTAL_ARRECADADO,
    NVL(AVG(pagamentos.VALOR_DEPOSITADO), 0) AS VALOR_MEDIO,
    NVL(MIN(pagamentos.VALOR_DEPOSITADO), 0) AS MENOR_PAGAMENTO,
    NVL(MAX(pagamentos.VALOR_DEPOSITADO), 0) AS MAIOR_PAGAMENTO
FROM FK2_TB_PAGAMENTOS pagamentos
WHERE ${whereClause}
`;
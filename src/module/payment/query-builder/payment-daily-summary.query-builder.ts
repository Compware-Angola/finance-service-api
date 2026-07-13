import { PaymentDailySummaryDto } from "../dto/payment-daily-summary.dto";

export const BASE_JOINS_PAYMENT_DAILY_SUMMARY = ``;

export const buildPaymentDailySummaryWhereClause = (
    filters: PaymentDailySummaryDto,
) => {
    const clauses: string[] = [
        `pagamentos.STATUS_PAGAMENTO = 'concluido'`,
        `TRUNC(pagamentos.CREATED_AT) = TRUNC(SYSDATE)`,
    ];
    const params: Record<string, any> = {};
    if (filters.formaPagamento) {
        clauses.push(`pagamentos.FORMA_PAGAMENTO = :formaPagamento`);
        params.formaPagamento = filters.formaPagamento.toString();
    }
    return {
        clauses,
        params,
    };
};
export const buildPaymentDailySummaryQuery = (whereClause: string) => `
SELECT
          COUNT(*) AS TOTAL_PAGAMENTOS,
          NVL(SUM(VALOR_DEPOSITADO), 0) AS TOTAL_ARRECADADO,
          NVL(AVG(VALOR_DEPOSITADO), 0) AS VALOR_MEDIO,
          NVL(MIN(VALOR_DEPOSITADO), 0) AS MENOR_PAGAMENTO,
          NVL(MAX(VALOR_DEPOSITADO), 0) AS MAIOR_PAGAMENTO
      FROM FK2_TB_PAGAMENTOS pagamentos
WHERE ${whereClause}
`;


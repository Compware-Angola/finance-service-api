import { PaymentSummaryDto } from "../dto/payment-summary.dto";

export const BASE_JOINS_PAYMENT_SUMMARY = `
LEFT JOIN FK2_TB_FORMA_PAGAMENTO fp
    ON fp.CODIGO = TO_NUMBER(pagamentos.FORMA_PAGAMENTO DEFAULT NULL ON CONVERSION ERROR)
    OR UPPER(TRIM(fp.DESCRICAO)) = UPPER(TRIM(pagamentos.FORMA_PAGAMENTO))
INNER JOIN FK2_FACTURA factura
    ON factura.CODIGO = pagamentos.CODIGO_FACTURA
`;

export const buildPaymentSummaryWhereClause = (
    filters: PaymentSummaryDto,
) => {
    const clauses: string[] = [
        `(pagamentos.STATUS_PAGAMENTO = 'concluido' OR factura.ESTADO = 1)`,
        `pagamentos.CREATED_AT >= TRUNC(NVL(TO_DATE(:dataInicio, 'YYYY-MM-DD'), SYSDATE))`,
        `pagamentos.CREATED_AT < TRUNC(NVL(TO_DATE(:dataFim, 'YYYY-MM-DD'), SYSDATE)) + 1`,
    ];

    const params: Record<string, any> = {
        dataInicio: filters.dataInicio ?? null,
        dataFim: filters.dataFim ?? null,
    };

    if (filters.codigoFormaPagamento) {
        clauses.push(
            `NVL(fp.CODIGO, -1) = TO_NUMBER(:codigoFormaPagamento)`,
        );
        params.codigoFormaPagamento = filters.codigoFormaPagamento;
    }

    return {
        clauses,
        params,
    };
};

export const buildPaymentSummaryQuery = (
    whereClause: string,
) => `
SELECT 
    NVL(fp.CODIGO, -1) AS CODIGO_FORMA_PAGAMENTO,
    NVL(fp.DESCRICAO, NVL(pagamentos.FORMA_PAGAMENTO, 'DESCONHECIDO')) AS TIPO_PAGAMENTO,
    COUNT(*) AS TOTAL_PAGAMENTOS,
    NVL(SUM(pagamentos.VALOR_DEPOSITADO), 0) AS TOTAL_PAGO
FROM FK2_TB_PAGAMENTOS pagamentos
${BASE_JOINS_PAYMENT_SUMMARY}
WHERE ${whereClause}
GROUP BY NVL(fp.CODIGO, -1), NVL(fp.DESCRICAO, NVL(pagamentos.FORMA_PAGAMENTO, 'DESCONHECIDO'))
ORDER BY TOTAL_PAGO DESC
`;
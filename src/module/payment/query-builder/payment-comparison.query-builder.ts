import { PaymentServiceComparisonDto } from "../dto/payment-comparison.dto";
export const buildPaymentServiceComparisonWhereClause = (
    filters: PaymentServiceComparisonDto,
) => {

    const clauses = [

        `pagamentos.STATUS_PAGAMENTO = 'concluido'`,

        `
        pagamentos.CREATED_AT >= TRUNC(
            TO_DATE(
                NVL(:year, TO_CHAR(SYSDATE,'YYYY')) || '-' ||
                LPAD(NVL(:month,TO_CHAR(SYSDATE,'MM')),2,'0') || '-01',
                'YYYY-MM-DD'
            ),
            'MM'
        )
        `,

        `
        pagamentos.CREATED_AT < ADD_MONTHS(
            TRUNC(
                TO_DATE(
                    NVL(:year, TO_CHAR(SYSDATE,'YYYY')) || '-' ||
                    LPAD(NVL(:month,TO_CHAR(SYSDATE,'MM')),2,'0') || '-01',
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

        params.formaPagamento =
            filters.formaPagamento.toString();
    }

    return {
        clauses,
        params,
    };
};

export const buildPaymentServiceComparisonQuery = (
    whereClause: string,
) => `
SELECT

    CASE
        WHEN servico.SIGLA = 'PROP'
            THEN 'PROP'
        ELSE 'OUTROS'
    END AS LABEL,

    COUNT(DISTINCT pagamentos.CODIGO) AS TOTAL_PAGAMENTOS,

    NVL(SUM(factura_items.TOTAL),0) AS TOTAL

FROM FK2_TB_PAGAMENTOS pagamentos

INNER JOIN FK2_FACTURA_ITEMS factura_items
    ON factura_items.CODIGOFACTURA = pagamentos.CODIGO_FACTURA

INNER JOIN FK2_TB_TIPO_SERVICOS servico
    ON servico.CODIGO = factura_items.CODIGOPRODUTO

WHERE ${whereClause}

GROUP BY
CASE
    WHEN servico.SIGLA = 'PROP'
        THEN 'PROP'
    ELSE 'OUTROS'
END

ORDER BY LABEL
`;
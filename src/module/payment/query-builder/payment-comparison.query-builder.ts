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

    pagamento_labels.LABEL,

    COUNT(*) AS TOTAL_PAGAMENTOS,

    NVL(SUM(pagamento_labels.VALOR_DEPOSITADO), 0) AS TOTAL

FROM (

    SELECT
        pagamentos.CODIGO,
        pagamentos.VALOR_DEPOSITADO,
        CASE
            WHEN MAX(
                CASE WHEN servico.SIGLA = 'PROP' THEN 1 ELSE 0 END
            ) = 1
                THEN 'PROP'
            ELSE 'OUTROS'
        END AS LABEL

    FROM FK2_TB_PAGAMENTOS pagamentos

    INNER JOIN FK2_FACTURA_ITEMS factura_items
        ON factura_items.CODIGOFACTURA = pagamentos.CODIGO_FACTURA

    INNER JOIN FK2_TB_TIPO_SERVICOS servico
        ON servico.CODIGO = factura_items.CODIGOPRODUTO

    WHERE ${whereClause}

    GROUP BY
        pagamentos.CODIGO,
        pagamentos.VALOR_DEPOSITADO

) pagamento_labels

GROUP BY pagamento_labels.LABEL

ORDER BY pagamento_labels.LABEL
`;
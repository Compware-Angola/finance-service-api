import { PaymentReportDto } from "../dto/payment-report.dto";

export const BASE_JOINS_PAYMENT_REPORT_QUERY = `
INNER JOIN FK2_TB_FORMA_PAGAMENTO forma_pagamento
    ON forma_pagamento.CODIGO = pagamentos.FORMA_PAGAMENTO

INNER JOIN FK2_MCA_TB_UTILIZADOR utilizador
    ON utilizador.PK_UTILIZADOR = pagamentos.FK_UTILIZADOR

INNER JOIN FK2_TB_PREINSCRICAO preinscricao
    ON preinscricao.CODIGO = pagamentos.CODIGO_PREINSCRICAO

INNER JOIN FK2_FACTURA_ITEMS factura_items
    ON factura_items.CODIGOFACTURA = pagamentos.CODIGO_FACTURA

INNER JOIN FK2_TB_TIPO_SERVICOS servico
    ON servico.CODIGO = factura_items.CODIGOPRODUTO

LEFT JOIN FK2_TB_CAIXAS caixa
    ON caixa.CODIGO = pagamentos.CAIXA_ID
`;

export const buildPaymentReportWhereClause = (
    filters: PaymentReportDto,
    userId: number,
) => {
    const clauses: string[] = [];
    const params: Record<string, any> = {};

    clauses.push(`pagamentos.FK_UTILIZADOR = :userId`);
    params.userId = userId;

    clauses.push(`pagamentos.STATUS_PAGAMENTO = 'concluido'`);

    if (filters.caixaId) {
        clauses.push(`pagamentos.CAIXA_ID = :caixaId`);
        params.caixaId = filters.caixaId;
    }

    if (filters.formaPagamento) {
        clauses.push(`pagamentos.FORMA_PAGAMENTO = :formaPagamento`);
        params.formaPagamento = filters.formaPagamento;
    }

    if (filters.search) {
        clauses.push(`
        (
            UPPER(preinscricao.NOME_COMPLETO) LIKE UPPER(:search)
            OR TO_CHAR(preinscricao.CODIGO) LIKE :search
        )
        `);

        params.search = `%${filters.search}%`;
    }
    if (filters.startDate) {
        clauses.push(`
        pagamentos.CREATED_AT >= TO_DATE(:startDate, 'YYYY-MM-DD')
    `);
        params.startDate = filters.startDate;
    }

    if (filters.endDate) {
        clauses.push(`
        pagamentos.CREATED_AT <= TO_DATE(:endDate, 'YYYY-MM-DD')
    `);
        params.endDate = filters.endDate;
    }
    return {
        clauses,
        params,
    };
};

export const buildPaymentReportQuery = (whereClause: string) => `
SELECT
    pagamentos.CREATED_AT AS data_pagamento,
    pagamentos.VALOR_DEPOSITADO AS valor_depositado,
    forma_pagamento.DESCRICAO AS forma_pagamento,
    utilizador.NOME AS nome_utilizador,
    preinscricao.NOME_COMPLETO AS aluno,
    caixa.NOME AS caixa,
    factura_items.CODIGO AS factura_item_codigo,
    servico.DESCRICAO AS servico_descricao,
    factura_items.QUANTIDADE AS quantidade,
    factura_items.PRECO AS preco,
    factura_items.MULTA AS multa,
    factura_items.TOTAL AS total

FROM FK2_TB_PAGAMENTOS pagamentos

${BASE_JOINS_PAYMENT_REPORT_QUERY}

WHERE ${whereClause}

ORDER BY pagamentos.CREATED_AT DESC,
         factura_items.CODIGO

OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
`;

export const buildPaymentReportCountQuery = (whereClause: string) => `
SELECT COUNT(*) TOTAL
FROM FK2_TB_PAGAMENTOS pagamentos

${BASE_JOINS_PAYMENT_REPORT_QUERY}

WHERE ${whereClause}
`;
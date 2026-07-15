export const buildPaymentPerformanceMonthlyQuery = () => `
WITH anos AS (
    SELECT
        :anoAtual    AS ano_atual,
        :anoAnterior AS ano_anterior,
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAtual)    AS label_ano_atual,
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAnterior) AS label_ano_anterior,
        (SELECT TRUNC(DATAINICIOPRIMEIROSEMESTRE, 'MM') FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAtual)    AS inicio_ano_atual,
        (SELECT TRUNC(DATAINICIOPRIMEIROSEMESTRE, 'MM') FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAnterior) AS inicio_ano_anterior
    FROM dual
),
meses AS (
    SELECT LEVEL AS ordem FROM dual CONNECT BY LEVEL <= 10
),
periodos AS (
    SELECT
        meses.ordem,
        ADD_MONTHS(anos.inicio_ano_atual, meses.ordem - 1)     AS inicio_mes_atual,
        ADD_MONTHS(anos.inicio_ano_atual, meses.ordem)         AS fim_mes_atual,
        ADD_MONTHS(anos.inicio_ano_anterior, meses.ordem - 1)  AS inicio_mes_anterior,
        ADD_MONTHS(anos.inicio_ano_anterior, meses.ordem)      AS fim_mes_anterior,
        anos.label_ano_atual,
        anos.label_ano_anterior,
        anos.ano_atual,
        anos.ano_anterior
    FROM meses
    CROSS JOIN anos
),
pagamentos_validos AS (
    SELECT
        pgt.CODIGO,
        pgt.ANOLECTIVO,
        pgt.CREATED_AT,
        pgt.VALOR_DEPOSITADO,
        pgt.STATUS_PAGAMENTO,
        factura.ESTADO AS FACTURA_ESTADO
    FROM FK2_TB_PAGAMENTOS pgt
    INNER JOIN FK2_FACTURA factura
        ON factura.CODIGO = pgt.CODIGO_FACTURA
)
SELECT
    periodos.ordem                                                                          AS ordem,
    TO_CHAR(periodos.inicio_mes_atual, 'MM')                                                 AS mes,
    TRIM(TO_CHAR(periodos.inicio_mes_atual, 'Month', 'NLS_DATE_LANGUAGE=PORTUGUESE'))         AS nome_mes,

    periodos.label_ano_atual                                                                  AS label_ano_atual,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = periodos.ano_atual
                  AND pagamentos.CREATED_AT >= periodos.inicio_mes_atual
                  AND pagamentos.CREATED_AT <  periodos.fim_mes_atual
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0)                                                                                     AS valor_ano_atual,

    periodos.label_ano_anterior                                                               AS label_ano_anterior,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = periodos.ano_anterior
                  AND pagamentos.CREATED_AT >= periodos.inicio_mes_anterior
                  AND pagamentos.CREATED_AT <  periodos.fim_mes_anterior
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0)                                                                                     AS valor_ano_anterior

FROM periodos
LEFT JOIN pagamentos_validos pagamentos
    ON (pagamentos.STATUS_PAGAMENTO = 'concluido' OR pagamentos.FACTURA_ESTADO = 1)
    AND (
        (pagamentos.ANOLECTIVO = periodos.ano_atual
            AND pagamentos.CREATED_AT >= periodos.inicio_mes_atual
            AND pagamentos.CREATED_AT <  periodos.fim_mes_atual)
        OR
        (pagamentos.ANOLECTIVO = periodos.ano_anterior
            AND pagamentos.CREATED_AT >= periodos.inicio_mes_anterior
            AND pagamentos.CREATED_AT <  periodos.fim_mes_anterior)
    )
GROUP BY
    periodos.ordem,
    periodos.inicio_mes_atual,
    periodos.label_ano_atual,
    periodos.label_ano_anterior
ORDER BY
    periodos.ordem
`;

export const buildPaymentPerformanceYearlyTotalsQuery = () => `
WITH anos AS (
    SELECT
        :anoAtual    AS ano_atual,
        :anoAnterior AS ano_anterior,
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAtual)    AS label_ano_atual,
        (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAnterior) AS label_ano_anterior,
        (SELECT TRUNC(DATAINICIOPRIMEIROSEMESTRE, 'MM') FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAtual)    AS inicio_ano_atual,
        (SELECT TRUNC(DATAINICIOPRIMEIROSEMESTRE, 'MM') FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoAnterior) AS inicio_ano_anterior
    FROM dual
),
pagamentos_validos AS (
    SELECT
        pgt.CODIGO,
        pgt.ANOLECTIVO,
        pgt.CREATED_AT,
        pgt.VALOR_DEPOSITADO,
        pgt.STATUS_PAGAMENTO,
        factura.ESTADO AS FACTURA_ESTADO
    FROM FK2_TB_PAGAMENTOS pgt
    INNER JOIN FK2_FACTURA factura
        ON factura.CODIGO = pgt.CODIGO_FACTURA
)
SELECT
    anos.label_ano_atual                                                                      AS label_ano_atual,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = anos.ano_atual
                  AND pagamentos.CREATED_AT >= anos.inicio_ano_atual
                  AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_atual, 10)
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0)                                                                                     AS total_valor_ano_atual,
    COUNT(DISTINCT CASE WHEN pagamentos.ANOLECTIVO = anos.ano_atual
                  AND pagamentos.CREATED_AT >= anos.inicio_ano_atual
                  AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_atual, 10)
             THEN pagamentos.CODIGO END)                                                      AS total_pagamentos_ano_atual,

    anos.label_ano_anterior                                                                   AS label_ano_anterior,
    NVL(SUM(
        CASE WHEN pagamentos.ANOLECTIVO = anos.ano_anterior
                  AND pagamentos.CREATED_AT >= anos.inicio_ano_anterior
                  AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_anterior, 10)
             THEN pagamentos.VALOR_DEPOSITADO ELSE 0 END
    ), 0)                                                                                     AS total_valor_ano_anterior,
    COUNT(DISTINCT CASE WHEN pagamentos.ANOLECTIVO = anos.ano_anterior
                  AND pagamentos.CREATED_AT >= anos.inicio_ano_anterior
                  AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_anterior, 10)
             THEN pagamentos.CODIGO END)                                                      AS total_pagamentos_ano_anterior

FROM anos
LEFT JOIN pagamentos_validos pagamentos
    ON (pagamentos.STATUS_PAGAMENTO = 'concluido' OR pagamentos.FACTURA_ESTADO = 1)
    AND (
        (pagamentos.ANOLECTIVO = anos.ano_atual
            AND pagamentos.CREATED_AT >= anos.inicio_ano_atual
            AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_atual, 10))
        OR
        (pagamentos.ANOLECTIVO = anos.ano_anterior
            AND pagamentos.CREATED_AT >= anos.inicio_ano_anterior
            AND pagamentos.CREATED_AT <  ADD_MONTHS(anos.inicio_ano_anterior, 10))
    )
GROUP BY
    anos.label_ano_atual,
    anos.label_ano_anterior
`;
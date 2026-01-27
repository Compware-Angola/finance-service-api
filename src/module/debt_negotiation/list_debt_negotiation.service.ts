import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetDebtNegotiationFilterDto } from './dto/find-deb-negotation.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

export interface DebtNegotiationStats {
  totalDividas: number;
  totalPrimeiroValorApagar: number;
  totalRestante: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: DebtNegotiationStats;
}

@Injectable()
export class ListDebtNegotiationService {
  constructor(private readonly dataSource: DataSource) {}
  async findNegotiations(
    filter: GetDebtNegotiationFilterDto,
  ): Promise<PagedResult<any>> {
    const {
      limit = 10,
      page = 1,
      codigoCurso,
      codigoAnoLectivo,
      tipoNegociacaoId,
      faculdadeId,
      codigoMatricula,
      nome,
    } = filter;

    // Validações mínimas (ajuste conforme sua regra de negócio)
    if (!codigoAnoLectivo) {
      throw new BadRequestException(
        'O ano letivo é obrigatório para listar negociações.',
      );
    }

    const offset = (page - 1) * limit;

    /* =============================================
       QUERY PRINCIPAL PAGINADA
       ============================================= */
    const dataSql = `
    SELECT
    nd.id,
    m.codigo                        AS codigo_matricula,
    p.NOME_COMPLETO                 AS nome,
    c.designacao                    AS curso,
    nd.VALOR_DIVIDA                 AS valor_divida,
    nd.QTD_PRESTACOES               AS prestacoes,
    nd.CREATED_AT                   AS data_criacao,
    mi.designacao                          AS mes_inicial,
    mf.designacao                          AS mes_final,
    nd.PRIMEIROVALORAPAGAR          AS primeiro_valor_pagar,
    nd.VALORPRESTACOES              AS valor_prestacao,
    nd.VALORRESTANTE                AS valor_restante,
    nd.CODIGO_FATURA                AS codigo_factura,
    nd.CODIGO_ANO_LECTIVO           AS ano_lectivo,
    nd.TIPO_NEGOCIACAO_ID           AS tipo_negociacao_id,
    c.FACULDADE_ID                  AS faculdade_id,
    f.DESIGNACAO                    AS faculdade
FROM FK2_NEGOCIACAO_DIVIDAS nd
INNER JOIN FK2_TB_MATRICULAS m
       ON m.codigo = nd.CODIGO_MATRICULA
INNER JOIN FK2_TB_ADMISSAO a
       ON a.codigo = m.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO p
       ON p.codigo = a.PRE_INCRICAO
LEFT  JOIN FK2_TB_CURSOS c
       ON c.codigo = m.CODIGO_CURSO
LEFT  JOIN fk2_meses_calendario mi
       ON mi.id = nd.ID_MES_INICIAL
LEFT  JOIN fk2_meses_calendario mf
       ON mf.id = nd.ID_MES_FINAL
LEFT  JOIN FK2_FACTURA fa
       ON fa.codigo = nd.CODIGO_FATURA
LEFT  JOIN FK2_TB_FACULDADE f
       ON f.codigo = c.FACULDADE_ID
WHERE 1=1
  AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
  AND (:codigoCurso IS NULL      OR c.codigo = :codigoCurso)
  AND (:tipoNegociacaoId IS NULL OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
  AND (:faculdadeId IS NULL      OR c.FACULDADE_ID = :faculdadeId)
  AND (:codigoMatricula IS NULL  OR m.codigo = :codigoMatricula)
  AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
ORDER BY nd.CREATED_AT ASC
OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const rawResults = await this.dataSource.query(dataSql, {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
      offset,
      limit,
    } as any);

    /* =============================================
       QUERY DE CONTAGEM TOTAL
       ============================================= */
    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_NEGOCIACAO_DIVIDAS nd
      INNER JOIN FK2_TB_MATRICULAS m
             ON m.codigo = nd.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO a
       ON a.codigo = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
       ON p.codigo = a.PRE_INCRICAO
      LEFT  JOIN FK2_TB_CURSOS c
             ON c.codigo = m.CODIGO_CURSO

      WHERE 1=1
        AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
        AND (:codigoCurso IS NULL          OR c.codigo = :codigoCurso)
        AND (:tipoNegociacaoId IS NULL     OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
        AND (:faculdadeId IS NULL          OR c.FACULDADE_ID = :faculdadeId)
        AND (:codigoMatricula IS NULL  OR m.codigo = :codigoMatricula)
        AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
    `;

    /* =============================================
   QUERY DE ESTATÍSTICAS (SUM)
   ============================================= */
    const statsSql = `
  SELECT
      COALESCE(SUM(nd.VALOR_DIVIDA), 0)        AS total_dividas,
      COALESCE(SUM(nd.PRIMEIROVALORAPAGAR), 0) AS total_primeiro_valor_apagar,
      COALESCE(SUM(nd.VALORRESTANTE), 0)       AS total_restante
  FROM FK2_NEGOCIACAO_DIVIDAS nd
  INNER JOIN FK2_TB_MATRICULAS m
         ON m.codigo = nd.CODIGO_MATRICULA
  INNER JOIN FK2_TB_ADMISSAO a
       ON a.codigo = m.CODIGO_ALUNO
  INNER JOIN FK2_TB_PREINSCRICAO p
       ON p.codigo = a.PRE_INCRICAO
  LEFT  JOIN FK2_TB_CURSOS c
         ON c.codigo = m.CODIGO_CURSO

  WHERE 1=1
    AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    AND (:codigoCurso IS NULL      OR c.codigo = :codigoCurso)
    AND (:tipoNegociacaoId IS NULL OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
    AND (:faculdadeId IS NULL      OR c.FACULDADE_ID = :faculdadeId)
    AND (:codigoMatricula IS NULL  OR m.codigo = :codigoMatricula)
    AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
`;

    const totalResult = await this.dataSource.query(countSql, {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
    } as any);
    const [statsResult] = await this.dataSource.query(statsSql, {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
    } as any);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rawResults),
      total,
      page,
      limit,
      totalPages,
      stats: {
        totalDividas: Number(statsResult?.TOTAL_DIVIDAS ?? 0),
        totalPrimeiroValorApagar: Number(
          statsResult?.TOTAL_PRIMEIRO_VALOR_APAGAR ?? 0,
        ),
        totalRestante: Number(statsResult?.TOTAL_RESTANTE ?? 0),
      },
    };
  }
}

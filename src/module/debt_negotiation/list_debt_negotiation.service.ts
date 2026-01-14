import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetDebtNegotiationFilterDto } from './dto/find-deb-negotation.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

 export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListDebtNegotiationService {
  constructor(private readonly dataSource: DataSource) {}
  async findNegotiations(
    filter:GetDebtNegotiationFilterDto): Promise<PagedResult<any>> {
    const {
      limit = 10,
      page = 1,
      codigoCurso,
      codigoAnoLectivo,
      tipoNegociacaoId,
      faculdadeId,
    } = filter;

    // Validações mínimas (ajuste conforme sua regra de negócio)
    if (!codigoAnoLectivo) {
      throw new BadRequestException('O ano letivo é obrigatório para listar negociações.');
    }

    const startRow = (page - 1) * limit + 1;
    const endRow = page * limit;

    /* =============================================
       QUERY PRINCIPAL PAGINADA
       ============================================= */
    const dataSql = `
    SELECT *
    FROM (
        SELECT
            m.codigo                        AS codigo_matricula,
            p.NOME_COMPLETO                 AS nome,
            c.designacao                    AS curso,
            nd.VALOR_DIVIDA                 AS valor_divida,
            nd.QTD_PRESTACOES               AS prestacoes,
            mi.mes                          AS mes_inicial,
            mf.mes                          AS mes_final,
            nd.PRIMEIROVALORAPAGAR          AS primeiro_valor_pagar,
            nd.VALORPRESTACOES              AS valor_prestacao,
            nd.VALORRESTANTE                AS valor_restante,
            
            -- campos úteis extras (opcional - pode remover se não precisar)
            nd.CODIGO_ANO_LECTIVO           AS ano_lectivo,
            nd.TIPO_NEGOCIACAO_ID           AS tipo_negociacao_id,
            c.FACULDADE_ID                  AS faculdade_id,
            
            ROW_NUMBER() OVER (
                ORDER BY nd.VALOR_DIVIDA DESC, m.codigo
            ) AS rn
        FROM FK2_NEGOCIACAO_DIVIDAS nd
        INNER JOIN FK2_TB_MATRICULAS m 
               ON m.codigo = nd.CODIGO_MATRICULA
        INNER JOIN FK2_TB_ADMISSAO a 
               ON a.codigo = m.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO p 
               ON p.codigo = a.PRE_INCRICAO
        LEFT  JOIN FK2_TB_CURSOS c 
               ON c.codigo = m.CODIGO_CURSO
        LEFT  JOIN FK2_MESES mi 
               ON mi.codigo = nd.ID_MES_INICIAL
        LEFT  JOIN FK2_MESES mf 
               ON mf.codigo = nd.ID_MES_FINAL
        LEFT  JOIN FK2_FACTURA fa 
               ON fa.codigo = nd.CODIGO_FATURA
        
        WHERE 1=1
          AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
          AND (:codigoCurso IS NULL          OR c.codigo = :codigoCurso)
          AND (:tipoNegociacaoId IS NULL     OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
          AND (:faculdadeId IS NULL          OR c.FACULDADE_ID = :faculdadeId)
    )
    WHERE rn BETWEEN :startRow AND :endRow
    `;

    const rawResults = await this.dataSource.query(dataSql, {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
      startRow,
      endRow,
    } as any);

    /* =============================================
       QUERY DE CONTAGEM TOTAL
       ============================================= */
    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_NEGOCIACAO_DIVIDAS nd
      INNER JOIN FK2_TB_MATRICULAS m 
             ON m.codigo = nd.CODIGO_MATRICULA
      LEFT  JOIN FK2_TB_CURSOS c 
             ON c.codigo = m.CODIGO_CURSO
      
      WHERE 1=1
        AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
        AND (:codigoCurso IS NULL          OR c.codigo = :codigoCurso)
        AND (:tipoNegociacaoId IS NULL     OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
        AND (:faculdadeId IS NULL          OR c.FACULDADE_ID = :faculdadeId)
    `;

    const totalResult = await this.dataSource.query(countSql, {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
    } as any);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rawResults),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
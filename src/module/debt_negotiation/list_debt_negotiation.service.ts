import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GetDebtNegotiationFilterDto } from './dto/find-deb-negotation.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { InjectRepository } from '@nestjs/typeorm';
import { ReconciliacaoNegociacaoDivida } from '../conciliacao-dividas/entities/conciliacao-divida.entity';

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
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ReconciliacaoNegociacaoDivida)
    private readonly reconciliacaoRepo: Repository<ReconciliacaoNegociacaoDivida>,
  ) { }

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
    mi.designacao                   AS mes_inicial,
    mf.designacao                   AS mes_final,
    nd.PRIMEIROVALORAPAGAR          AS primeiro_valor_pagar,
    nd.VALORPRESTACOES              AS valor_prestacao,
    nd.VALORRESTANTE                AS valor_restante,
    nd.CODIGO_FATURA                AS codigo_factura,
    nd.CODIGO_ANO_LECTIVO           AS ano_lectivo,
    nd.TIPO_NEGOCIACAO_ID           AS tipo_negociacao_id,
    c.FACULDADE_ID                  AS faculdade_id,
    f.DESIGNACAO                    AS faculdade
  FROM FK2_NEGOCIACAO_DIVIDAS nd
  INNER JOIN FK2_TB_MATRICULAS m       ON m.codigo    = nd.CODIGO_MATRICULA
  INNER JOIN FK2_TB_ADMISSAO a         ON a.codigo    = m.CODIGO_ALUNO
  INNER JOIN FK2_TB_PREINSCRICAO p     ON p.codigo    = a.PRE_INCRICAO
  LEFT  JOIN FK2_TB_CURSOS c           ON c.codigo    = m.CODIGO_CURSO
  LEFT  JOIN fk2_meses_calendario mi   ON mi.id       = nd.ID_MES_INICIAL
  LEFT  JOIN fk2_meses_calendario mf   ON mf.id       = nd.ID_MES_FINAL
  LEFT  JOIN FK2_FACTURA fa            ON fa.codigo   = nd.CODIGO_FATURA
  LEFT  JOIN FK2_TB_FACULDADE f        ON f.codigo    = c.FACULDADE_ID
  WHERE 1=1
    AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    AND (:codigoCurso IS NULL      OR c.codigo             = :codigoCurso)
    AND (:tipoNegociacaoId IS NULL OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
    AND (:faculdadeId IS NULL      OR c.FACULDADE_ID        = :faculdadeId)
    AND (:codigoMatricula IS NULL  OR m.codigo             = :codigoMatricula)
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
       QUERY DE FACTURAS + ITENS (para os IDs da página)
       ============================================= */
    let facturasMap: Map<number, any[]> = new Map();

    if (rawResults.length > 0) {
      // Extrai os IDs das negociações da página atual
      const negociacaoIds: number[] = rawResults.map((r: any) => Number(r.ID ?? r.id));

      // Uma única query que traz facturas + itens para todas as negociações da página
      const facturasSql = `
      SELECT
        nf.CODIGO_NEGOCIACAO,
        fa.CODIGO                   AS factura_id,
        fa.DATAFACTURA              AS factura_data,
        fa.TOTALPRECO               AS factura_total_preco,
        fa.VALORAPAGAR              AS factura_valor_apagar,
        fa.VALORENTREGUE            AS factura_valor_entregue,
        fa.DESCONTO                 AS factura_desconto,
        fa.TOTALIVA                 AS factura_total_iva,
        fa.TOTALMULTA               AS factura_total_multa,
        fa.TOTAL_INCIDENCIA         AS factura_total_incidencia,
        fa.TOTAL_RETENCAO           AS factura_total_retencao,
        fa.VALORAPAGAREXTENSO       AS factura_valor_apagar_extenso,
        fa.DESCRICAO                AS factura_descricao,
        fa.REFERENCIA               AS factura_referencia,
        fa.DATAVENCIMENTO           AS factura_data_vencimento,
        fa.ESTADO                   AS factura_estado,
        fa.ANO_LECTIVO              AS factura_ano_lectivo
  
      FROM FK2_TB_NEGOCIACAO_FACTURA nf
      LEFT JOIN FK2_FACTURA fa        ON fa.CODIGO = nf.CODIGO_FACTURA
      
      WHERE nf.CODIGO_NEGOCIACAO IN (${negociacaoIds.join(',')})
        AND nf.DELETED_AT IS NULL
      ORDER BY nf.CODIGO_NEGOCIACAO, fa.CODIGO
    `;

      const facturasRaw: any[] = await this.dataSource.query(facturasSql);

      // Agrupa: negociacaoId → [facturas com seus itens]
      // Estrutura intermediária: Map<negociacaoId, Map<facturaId, { ...dadosFactura, itens: [...] }>>
      const negociacaoFacturasTemp = new Map<number, Map<number, any>>();


      for (const row of facturasRaw) {
        const negId = Number(row.CODIGO_NEGOCIACAO);
        const faId = Number(row.FACTURA_ID);

        if (!negociacaoFacturasTemp.has(negId)) {
          negociacaoFacturasTemp.set(negId, new Map());
        }
        const facturasDoNeg = negociacaoFacturasTemp.get(negId)!;

        if (!facturasDoNeg.has(faId)) {
          facturasDoNeg.set(faId, {
            codigo: faId,
            data: row.FACTURA_DATA,
            total_preco: Number(row.FACTURA_TOTAL_PRECO ?? 0),
            valor_apagar: Number(row.FACTURA_VALOR_APAGAR ?? 0),
            valor_entregue: Number(row.FACTURA_VALOR_ENTREGUE ?? 0),
            desconto: Number(row.FACTURA_DESCONTO ?? 0),
            total_iva: Number(row.FACTURA_TOTAL_IVA ?? 0),
            total_multa: Number(row.FACTURA_TOTAL_MULTA ?? 0),
            total_incidencia: Number(row.FACTURA_TOTAL_INCIDENCIA ?? 0),
            total_retencao: Number(row.FACTURA_TOTAL_RETENCAO ?? 0),
            valor_apagar_extenso: row.FACTURA_VALOR_APAGAR_EXTENSO,
            descricao: row.FACTURA_DESCRICAO,
            referencia: row.FACTURA_REFERENCIA,
            data_vencimento: row.FACTURA_DATA_VENCIMENTO,
            estado: row.FACTURA_ESTADO,
            ano_lectivo: row.FACTURA_ANO_LECTIVO
          });
        }


      }

      // Converte para o Map final: negociacaoId → array de facturas
      for (const [negId, facturasMap_] of negociacaoFacturasTemp) {
        facturasMap.set(negId, Array.from(facturasMap_.values()));
      }
    }

    /* =============================================
       QUERY DE CONTAGEM TOTAL
       ============================================= */
    const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_NEGOCIACAO_DIVIDAS nd
    INNER JOIN FK2_TB_MATRICULAS m   ON m.codigo = nd.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO a     ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p ON p.codigo = a.PRE_INCRICAO
    LEFT  JOIN FK2_TB_CURSOS c       ON c.codigo = m.CODIGO_CURSO
    WHERE 1=1
      AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND (:codigoCurso IS NULL          OR c.codigo              = :codigoCurso)
      AND (:tipoNegociacaoId IS NULL     OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
      AND (:faculdadeId IS NULL          OR c.FACULDADE_ID        = :faculdadeId)
      AND (:codigoMatricula IS NULL      OR m.codigo              = :codigoMatricula)
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
    INNER JOIN FK2_TB_MATRICULAS m   ON m.codigo = nd.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO a     ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p ON p.codigo = a.PRE_INCRICAO
    LEFT  JOIN FK2_TB_CURSOS c       ON c.codigo = m.CODIGO_CURSO
    WHERE 1=1
      AND nd.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND (:codigoCurso IS NULL      OR c.codigo              = :codigoCurso)
      AND (:tipoNegociacaoId IS NULL OR nd.TIPO_NEGOCIACAO_ID = :tipoNegociacaoId)
      AND (:faculdadeId IS NULL      OR c.FACULDADE_ID        = :faculdadeId)
      AND (:codigoMatricula IS NULL  OR m.codigo              = :codigoMatricula)
      AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
  `;

    const sharedParams = {
      codigoAnoLectivo,
      codigoCurso: codigoCurso ?? null,
      tipoNegociacaoId: tipoNegociacaoId ?? null,
      faculdadeId: faculdadeId ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
    };

    const [totalResult, [statsResult]] = await Promise.all([
      this.dataSource.query(countSql, sharedParams as any),
      this.dataSource.query(statsSql, sharedParams as any),
    ]);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    // Monta o resultado final: cada negociação recebe seu array de facturas
    const data = toLowerCaseKeys(rawResults).map((neg: any) => ({
      ...neg,
      facturas: facturasMap.get(Number(neg.id)) ?? [],
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      stats: {
        totalDividas: Number(statsResult?.TOTAL_DIVIDAS ?? 0),
        totalPrimeiroValorApagar: Number(statsResult?.TOTAL_PRIMEIRO_VALOR_APAGAR ?? 0),
        totalRestante: Number(statsResult?.TOTAL_RESTANTE ?? 0),
      },
    };
  }
  async getDetails(id: string) {
    const negociacaoId = Number(id);

    if (!negociacaoId || Number.isNaN(negociacaoId)) {
      throw new BadRequestException('ID da negociação inválido.');
    }
    // Se ja esta na reconciliacao deve informar no user
    const isReconciliado = await this.reconciliacaoRepo.findOne({
      where: {
        id: negociacaoId,
      },
    });
    /* =============================================
       DADOS DA NEGOCIAÇÃO
       ============================================= */
    const negociacaoSql = `
    SELECT
      nd.id,
      m.codigo                        AS codigo_matricula,
      p.NOME_COMPLETO                 AS nome,
      c.designacao                    AS curso,
      nd.VALOR_DIVIDA                 AS valor_divida,
      nd.QTD_PRESTACOES               AS prestacoes,
      nd.CREATED_AT                   AS data_criacao,
      mi.designacao                   AS mes_inicial,
      mf.designacao                   AS mes_final,
      nd.PRIMEIROVALORAPAGAR          AS primeiro_valor_pagar,
      nd.VALORPRESTACOES              AS valor_prestacao,
      nd.VALORRESTANTE                AS valor_restante,
      nd.CODIGO_FATURA                AS codigo_factura,
      nd.CODIGO_ANO_LECTIVO           AS ano_lectivo,
      nd.TIPO_NEGOCIACAO_ID           AS tipo_negociacao_id,
      c.FACULDADE_ID                  AS faculdade_id,
      f.DESIGNACAO                    AS faculdade
    FROM FK2_NEGOCIACAO_DIVIDAS nd
    INNER JOIN FK2_TB_MATRICULAS m       ON m.codigo    = nd.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO a         ON a.codigo    = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p     ON p.codigo    = a.PRE_INCRICAO
    LEFT  JOIN FK2_TB_CURSOS c           ON c.codigo    = m.CODIGO_CURSO
    LEFT  JOIN fk2_meses_calendario mi   ON mi.id       = nd.ID_MES_INICIAL
    LEFT  JOIN fk2_meses_calendario mf   ON mf.id       = nd.ID_MES_FINAL
    LEFT  JOIN FK2_TB_FACULDADE f        ON f.codigo    = c.FACULDADE_ID
    WHERE nd.id = :negociacaoId
  `;

    const negociacaoResult = await this.dataSource.query(negociacaoSql, {
      negociacaoId,
    } as any);

    if (!negociacaoResult.length) {
      throw new NotFoundException('Negociação de dívida não encontrada.');
    }

    const negociacao = toLowerCaseKeys(negociacaoResult)[0];

    /* =============================================
       FACTURAS RELACIONADAS À NEGOCIAÇÃO
       Query única: busca via tabela de relacionamento
       (FK2_TB_NEGOCIACAO_FACTURA) e, apenas quando
       essa estrutura não tiver nenhum registro para a
       negociação, complementa com a busca direta pela
       FK2_FATURA usando o CODIGO_FATURA da negociação
       (NOT EXISTS evita duplicar quando já existe
       relacionamento).
       ============================================= */
    const facturasSql = `
      SELECT
        fa.CODIGO                   AS factura_id,
        fa.DATAFACTURA              AS factura_data,
        fa.TOTALPRECO               AS factura_total_preco,
        fa.VALORAPAGAR              AS factura_valor_apagar,
        fa.VALORENTREGUE            AS factura_valor_entregue,
        fa.DESCONTO                 AS factura_desconto,
        fa.TOTALIVA                 AS factura_total_iva,
        fa.TOTALMULTA               AS factura_total_multa,
        fa.TOTAL_INCIDENCIA         AS factura_total_incidencia,
        fa.TOTAL_RETENCAO           AS factura_total_retencao,
        fa.VALORAPAGAREXTENSO       AS factura_valor_apagar_extenso,
        fa.DESCRICAO                AS factura_descricao,
        fa.REFERENCIA               AS factura_referencia,
        fa.DATAVENCIMENTO           AS factura_data_vencimento,
        fa.ESTADO                   AS factura_estado,
        fa.ANO_LECTIVO              AS factura_ano_lectivo,
        0                            AS esta_na_negociacao
      FROM FK2_TB_NEGOCIACAO_FACTURA nf
      INNER JOIN FK2_FACTURA fa ON fa.CODIGO = nf.CODIGO_FACTURA
      WHERE nf.CODIGO_NEGOCIACAO = :negociacaoId
        AND nf.DELETED_AT IS NULL

      UNION ALL

      SELECT
        fa.CODIGO                   AS factura_id,
        fa.DATAFACTURA              AS factura_data,
        fa.TOTALPRECO               AS factura_total_preco,
        fa.VALORAPAGAR              AS factura_valor_apagar,
        fa.VALORENTREGUE            AS factura_valor_entregue,
        fa.DESCONTO                 AS factura_desconto,
        fa.TOTALIVA                 AS factura_total_iva,
        fa.TOTALMULTA               AS factura_total_multa,
        fa.TOTAL_INCIDENCIA         AS factura_total_incidencia,
        fa.TOTAL_RETENCAO           AS factura_total_retencao,
        fa.VALORAPAGAREXTENSO       AS factura_valor_apagar_extenso,
        fa.DESCRICAO                AS factura_descricao,
        fa.REFERENCIA               AS factura_referencia,
        fa.DATAVENCIMENTO           AS factura_data_vencimento,
        fa.ESTADO                   AS factura_estado,
        fa.ANO_LECTIVO              AS factura_ano_lectivo,
        1                            AS esta_na_negociacao
      FROM FK2_NEGOCIACAO_DIVIDAS nd
      INNER JOIN FK2_FACTURA fa ON fa.CODIGO = nd.CODIGO_FATURA
      WHERE nd.id = :negociacaoId
        AND NOT EXISTS (
          SELECT 1
          FROM FK2_TB_NEGOCIACAO_FACTURA nf2
          WHERE nf2.CODIGO_NEGOCIACAO = :negociacaoId
            AND nf2.DELETED_AT IS NULL
        )

      ORDER BY factura_id
    `;

    const facturasRaw: any[] = await this.dataSource.query(facturasSql, {
      negociacaoId,
    } as any);

    const facturaEstaNaNegociacao = facturasRaw.length > 0
      && Number(facturasRaw[0].ESTA_NA_NEGOCIACAO) === 1;

    const facturaIds = facturasRaw
      .map((f) => Number(f.FACTURA_ID))
      .filter((v) => !Number.isNaN(v));

    /* =============================================
       ITENS DAS FACTURAS
       ============================================= */
    const itensPorFactura = new Map<number, any[]>();

    if (facturaIds.length > 0) {
      const itensSql = `
      SELECT
        fi.CODIGOFACTURA           AS codigo_factura,
        fi.CODIGO                   AS item_id,
        s.DESCRICAO                AS item_descricao,
        fi.QUANTIDADE                AS item_quantidade,
        s.PRECO           AS item_preco_unitario,
        fi.TOTAL              AS item_valor_total,
        mt.DESIGNACAO                AS mes_designacao
      FROM FK2_FACTURA_ITEMS fi
      LEFT JOIN FK2_TB_TIPO_SERVICOS s ON s.CODIGO = fi.CODIGOPRODUTO
      LEFT JOIN FK2_MES_TEMP mt ON mt.ID = fi.MES_TEMP_ID
      WHERE fi.CODIGOFACTURA IN (${facturaIds.join(',')})
      ORDER BY fi.CODIGOFACTURA, fi.CODIGO
    `;

      const itensRaw: any[] = await this.dataSource.query(itensSql);

      for (const item of itensRaw) {
        const faId = Number(item.CODIGO_FACTURA);
        if (!itensPorFactura.has(faId)) {
          itensPorFactura.set(faId, []);
        }
        itensPorFactura.get(faId)!.push({
          codigo: item.ITEM_ID,
          descricao: item.ITEM_DESCRICAO,
          quantidade: Number(item.ITEM_QUANTIDADE ?? 0),
          preco_unitario: Number(item.ITEM_PRECO_UNITARIO ?? 0),
          valor_total: Number(item.ITEM_VALOR_TOTAL ?? 0),
          mes_designacao: item.MES_DESIGNACAO
        });
      }
    }

    /* =============================================
       MONTAGEM DO RESULTADO FINAL
       ============================================= */
    const facturas = facturasRaw.map((row) => {
      const faId = Number(row.FACTURA_ID);

      return {
        codigo: faId,
        data: row.FACTURA_DATA,
        total_preco: Number(row.FACTURA_TOTAL_PRECO ?? 0),
        valor_apagar: Number(row.FACTURA_VALOR_APAGAR ?? 0),
        valor_entregue: Number(row.FACTURA_VALOR_ENTREGUE ?? 0),
        desconto: Number(row.FACTURA_DESCONTO ?? 0),
        total_iva: Number(row.FACTURA_TOTAL_IVA ?? 0),
        total_multa: Number(row.FACTURA_TOTAL_MULTA ?? 0),
        total_incidencia: Number(row.FACTURA_TOTAL_INCIDENCIA ?? 0),
        total_retencao: Number(row.FACTURA_TOTAL_RETENCAO ?? 0),
        valor_apagar_extenso: row.FACTURA_VALOR_APAGAR_EXTENSO,
        descricao: row.FACTURA_DESCRICAO,
        referencia: row.FACTURA_REFERENCIA,
        data_vencimento: row.FACTURA_DATA_VENCIMENTO,
        estado: row.FACTURA_ESTADO,
        ano_lectivo: row.FACTURA_ANO_LECTIVO,
        itens: itensPorFactura.get(faId) ?? [],
      };
    });

    return {
      ...negociacao,
      facturas,
      esta_na_negociacao: facturaEstaNaNegociacao,
      isReconciliado: !!isReconciliado,
    };
  }
}

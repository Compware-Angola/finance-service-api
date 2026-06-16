import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { GetDebtDtoNew } from "./dto/find-debit.dto";
import { MonthlyFeesDiscountUtilService } from "../shared/monthly_fees/monthly_fees.discount.Util.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { GetAllDebtNegotiationsResponse } from "./types/types";




@Injectable()
export class NegotiationService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly monthlyFeeDiscount: MonthlyFeesDiscountUtilService,
    ) { }

    async getAllDebtNegotiations(
        paginationQuery: GetDebtDtoNew,
    ): Promise<GetAllDebtNegotiationsResponse> {
        const {
            codigo_matricula,
            codAnoLectivo
        } = paginationQuery;

        // ====================== VERIFICAR CONFIRMAÇÃO ======================
        if (codAnoLectivo) {
            const confirmacao = await this.dataSource.query(
                `SELECT COUNT(*) AS total 
         FROM fk2_tb_confirmacoes cf
         WHERE cf.codigo_matricula = :codigo_matricula
           AND cf.CODIGO_ANO_LECTIVO = :codAnoLectivo`,
                { codigo_matricula, codAnoLectivo } as any
            );
            console.log(confirmacao);


            const total = Number(confirmacao[0]?.TOTAL ?? confirmacao[0]?.total ?? 0);

            if (total === 0) {
                throw new BadRequestException(
                    `O estudante não possui confirmação de matrícula para o ano lectivo seleccionado.`
                );
            }
        }

        if (!codigo_matricula) return { Mensalidades: [], OutrosServicos: [], anoAtual: 0, totalIVA: 0, percentagem_retencao: 0, totalDivida: 0, total_incidencia: 0, total_retencao: 0, size: 0, desconto: 0, precoTotal: 0 };
        const aluno = await this.obterDadosCompletosAluno(codigo_matricula);
        if (aluno.estado_matricula.toUpperCase() == 'DIPLOMADO') return { Mensalidades: [], OutrosServicos: [], anoAtual: 0, totalIVA: 0, percentagem_retencao: 0, totalDivida: 0, total_incidencia: 0, total_retencao: 0, size: 0, desconto: 0, precoTotal: 0 };


        // ====================== FILTRO DE ANO LECTIVO ======================
        const filtroAnoLectivo = `
  ${codAnoLectivo
                ? `AND mt.ano_lectivo = :codAnoLectivo`
                : `AND mt.ano_lectivo IN (
            SELECT DISTINCT cf.CODIGO_ANO_LECTIVO
            FROM fk2_tb_confirmacoes cf
            WHERE cf.codigo_matricula = :codigo_matricula
        )`
            }

  AND NOT EXISTS (
      SELECT 1
      FROM fk2_tb_ano_lectivo a
      WHERE a.codigo = mt.ano_lectivo
       AND TRIM(UPPER(a.estado)) = 'ACTIVO'
  )
`;

        const params: any = codAnoLectivo
            ? { codigo_matricula, codAnoLectivo }
            : { codigo_matricula };

        // ====================== FILTRO DE STATUS ======================
        const filtroStatus = `AND f.estado != 1`;

        // ====================== SQL PRINCIPAL ======================
        const sql = `
    SELECT 
      mt.id                                         AS mes_temp_id,
      mt.designacao                                 AS mes,
      mt.data_inicial                               AS data_inicial,
      mt.data_final                                 AS data_final,
      mt.data_limite                                AS data_limite,
      mt.semestre                                   AS semestre,
      mt.data_final_desconto                        AS data_final_desconto,
      fi.codigo                                     AS id_item,
      fi.CodigoProduto                              AS codigo_servico,
      ts.Descricao                                  AS descricao_servico,
      ts.TipoServico                                AS tipo_servico,
      NVL(fi.preco, ts.Preco)                       AS mensalidade,
      NVL(fi.descontoProduto, 0)                    AS desconto,
      fi.Multa                                      AS multa,
      fi.Total                                      AS total_item,
      fi.valor_pago                                 AS valor_pago,
      fi.Total                                      AS total,
      fi.preco                                      AS total_preco,
      NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0)    AS codigo_matricula,
      NVL(TO_NUMBER(TRIM(f.ano_lectivo)), 0)        AS ano_lectivo_fatura,
      f.Referencia                                  AS reference,
      f.ValorAPagar                                 AS ValorAPagar,
      f.ValorEntregue                               AS valorEntregue,
      f.dataVencimento                              AS data_vencimento,
      f.Codigo                                      AS codigo_factura,
      f.TotalPreco                                  AS total_preco_fatura,
      NVL(TO_CHAR(f.estado), '0')                   AS estado_fatura,
      pg.data_operacao                              AS data_operacao,
      pg.Data                                       AS data_pagamento,
      CASE 
        WHEN fi.valor_pago >= fi.Total THEN 1
        WHEN fi.valor_pago > 0 THEN 2
        ELSE 0
      END                                           AS status_pagamento
    FROM fk2_mes_temp mt
    INNER JOIN FK2_FACTURA_ITEMS fi ON fi.mes_temp_id = mt.id
    INNER JOIN FK2_FACTURA f        ON f.Codigo = fi.CodigoFactura
    LEFT  JOIN FK2_TB_TIPO_SERVICOS ts ON fi.CodigoProduto = ts.Codigo
    LEFT  JOIN FK2_TB_PAGAMENTOS pg    ON pg.codigo_factura = f.Codigo
    WHERE f.CodigoMatricula = :codigo_matricula
      AND f.estado != 3
      ${filtroAnoLectivo}
      ${filtroStatus}
    ORDER BY mt.prestacao ASC
  `;

        const results = await this.dataSource.query(sql, params as any);
        let generated: any[] = [];
        generated = await this.monthlyFeeDiscount.generatePayment({
            codAnoLectivo: codAnoLectivo!,
            codigo_matricula,
            status: 'pending',
            is_Negotation: true
        });
        console.log(generated);

        const data = [...results, ...generated];
        const recorrencias = await this.mapRecorrenciasAdicionais(
            await this.obterRecorrenciasAdicionais(
                codigo_matricula,
                codAnoLectivo,
            ),
        );


        const mensalidades = toLowerCaseKeys(data);
        const outrosServicos = toLowerCaseKeys(recorrencias);

        // Apenas itens não pagos (status_pagamento != 1)
        const itensPendentes = mensalidades.filter((m: any) => m.status_pagamento !== 1);

        // ── Mensalidades ──────────────────────────────────────────
        const totalMensalidades = itensPendentes.reduce(
            (acc: number, m: any) => acc + (Number(m.total ?? m.total_item) || 0), 0
        );

        const desconto = [
            ...itensPendentes,
            ...outrosServicos,
        ].reduce((acc: number, m: any) => acc + (Number(m.desconto ?? m.fi_descontoproduto) || 0), 0);

        // ── Outros Serviços ───────────────────────────────────────
        const totalOutrosServicos = outrosServicos.reduce(
            (acc: number, s: any) => acc + (Number(s.total) || 0), 0
        );

        // ── IVA (soma dos valor_iva de OutrosServicos) ────────────
        const totalIVA = outrosServicos.reduce(
            (acc: number, s: any) => acc + (Number(s.valor_iva) || 0), 0
        );

        // ── Incidência (base de cálculo antes do IVA) ─────────────
        const total_incidencia = outrosServicos.reduce(
            (acc: number, s: any) => acc + (Number(s.incidencia) || 0), 0
        );

        // ── Retenção ──────────────────────────────────────────────
        const percentagem_retencao = aluno?.percentagem_retencao ?? 0;
        const total_retencao = (total_incidencia * percentagem_retencao) / 100;

        // ── Totais finais ─────────────────────────────────────────
        const totalDivida = totalMensalidades + totalOutrosServicos;
        const precoTotal = totalDivida - desconto + totalIVA;
        const size = itensPendentes.length + outrosServicos.length;

        return {
            Mensalidades: mensalidades,
            OutrosServicos: outrosServicos,
            anoAtual: Number(codAnoLectivo) || 0,
            totalIVA,
            percentagem_retencao,
            totalDivida,
            total_incidencia,
            total_retencao,
            size,
            desconto,
            precoTotal,
        };
    }
    private async obterDadosCompletosAluno(codigoMatricula: number) {
        const sql = `
          SELECT 
            c.designacao           as curso,
            c.codigo               as codigo_curso,
            c.sigla                as sigla,
            c.duracao              as duracao_curso,
            p.codigo_turno         as turno,
            nvl(p.polo_id, 1)      as polo,
            m.estado_matricula     as estado_matricula
          FROM fk2_tb_matriculas m
          INNER JOIN fk2_tb_cursos        c ON c.codigo = m.codigo_curso
          INNER JOIN fk2_tb_admissao      a ON a.codigo = m.codigo_aluno
          INNER JOIN fk2_tb_preinscricao  p ON p.codigo = a.pre_incricao
          WHERE m.codigo = :codigoMatricula
        `;

        const result = await this.dataSource.query(sql, { codigoMatricula } as any);
        const row = result?.[0];

        if (!row) {
            throw new BadRequestException('Informações do aluno não encontradas');
        }

        return toLowerCaseKeys(row);
    }
    private async obterRecorrenciasAdicionais(
        codigo_matricula: number,
        codAnoLectivo?: number,
    ) {
        const filtros: string[] = [
            `ia.codigo_matricula = :codigo_matricula`,
            `ia.estado != 'anulado'`,
            `f.estado NOT IN (1, 3)`,
            `f.corrente = 1`,
            `ia.codigo_tipo_avaliacao IN (7,11,22)`,
        ];

        const params: any = {
            codigo_matricula,
        };

        if (codAnoLectivo) {
            filtros.push(`ia.codigo_ano_lectivo = :codAnoLectivo`);
            params.codAnoLectivo = codAnoLectivo;
        }

        const sql = `
        SELECT 
          f.Codigo                        AS f_codigo,
          MAX(f.ValorAPagar)              AS f_valorapagar,
          gc.Codigo                       AS gc_codigo,
          ia.codigo_tipo_avaliacao        AS codigo_tipo_avaliacao,
          MAX(fi.preco)                   AS fi_preco,
          MAX(fi.Multa)                   AS fi_multa,
          MAX(fi.descontoProduto)         AS fi_descontoproduto,
          MAX(fi.Total)                   AS fi_total,
          MAX(d.Designacao)               AS d_designacao,
          MAX(al.Codigo)                  AS al_codigo,
          MAX(al.Designacao)              AS al_designacao,
          MAX(ts.Codigo)                  AS ts_codigo,
          MAX(fi.incidencia)              AS fi_incidencia,
          MAX(fi.valor_iva)               AS fi_valor_iva,
          MAX(fi.taxa_iva)                AS fi_taxa_iva,
          MAX(tt.descricao)               AS tt_descricao

        FROM FK2_INSCRICAO_AVALIACOES ia

        LEFT JOIN FK2_FACTURA f
          ON f.Codigo = ia.codigo_factura

        LEFT JOIN FK2_FACTURA_ITEMS fi
          ON fi.CodigoFactura = f.Codigo

        LEFT JOIN FK2_TB_ANO_LECTIVO al
          ON al.Codigo = f.ano_lectivo

        LEFT JOIN FK2_TB_TIPO_SERVICOS ts
          ON ts.Codigo = fi.CodigoProduto

        LEFT JOIN FK2_TIPO_TAXAS tt
          ON tt.id = ts.taxa_iva_id

        LEFT JOIN FK2_TB_GRADE_CURRICULAR gc
          ON gc.Codigo = ts.CODIGO_GRADE_CURRILULAR

        LEFT JOIN FK2_TB_DISCIPLINAS d
          ON d.Codigo = gc.Codigo_Disciplina

        WHERE ${filtros.join(' AND ')}

        GROUP BY
          gc.Codigo,
          f.Codigo,
          ia.codigo_tipo_avaliacao

        ORDER BY gc.Codigo
    `;

        const result = await this.dataSource.query(sql, params);

        return toLowerCaseKeys(result);
    }
    private async mapRecorrenciasAdicionais(recorrenciasAdicionaisRaw: any[]) {
        let recorrencias: any[] = [];

        for (const raw of recorrenciasAdicionaisRaw) {
            console.log(raw);


            const codGradeCurricular = raw.gc_codigo;

            const servico = this.montarNomeServico(
                raw.d_designacao || '',
                raw.codigo_tipo_avaliacao,
            );
            recorrencias.push({
                codGradeCurricular,
                codFacturaOutrosServicos: raw.f_codigo,
                valor: Number(raw.fi_preco),
                multa: Number(raw.fi_multa),
                total: Number(raw.fi_total),
                servico,
                ano_lectivo: raw.al_designacao,
                taxa_multa: 0,
                taxa_desconto: 0,
                codidigo_servico: Number(raw.ts_codigo),
                codigo_anoLectivo: Number(raw.al_codigo),
                desconto: Number(raw.fi_descontoproduto),
                incidencia: Number(raw.fi_incidencia),
                valor_iva: Number(raw.fi_valor_iva),
                tipo_taxas: Number(raw.fi_taxa_iva),
                taxa_descricao: raw.tt_descricao,
            });
        }

        return recorrencias;
    }
    private montarNomeServico(
        designacao: string,
        codigoTipoAvaliacao?: number,
    ): string {
        switch (Number(codigoTipoAvaliacao)) {
            case 7:
                return `Rec. ${designacao}`;

            case 22:
                return `Melhoria. ${designacao}`;

            case 11:
                return `Exame Especial. ${designacao}`;

            default:
                return designacao;
        }
    }
}
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

        if (!codigo_matricula) return { Mensalidades: [], OutrosServicos: [], anoAtual: 0, totalIVA: 0, percentagem_retencao: 0, totalDivida: 0, total_incidencia: 0, total_retencao: 0, size: 0, desconto: 0, precoTotal: 0, bolsa: 0, saldo_reset: 0, somaValorDividaRecurso: 0, somaDividaFacturas: 0 };
        const aluno = await this.obterDadosCompletosAluno(codigo_matricula);
        if (aluno.estado_matricula.toUpperCase() == 'DIPLOMADO') return { Mensalidades: [], OutrosServicos: [], anoAtual: 0, totalIVA: 0, percentagem_retencao: 0, totalDivida: 0, total_incidencia: 0, total_retencao: 0, size: 0, desconto: 0, precoTotal: 0, bolsa: 0, saldo_reset: 0, somaValorDividaRecurso: 0, somaDividaFacturas: 0 };


        // ====================== FILTRO DE ANO LECTIVO ======================
        const filtroAnoLectivo = codAnoLectivo
            ? `AND mt.ano_lectivo = :codAnoLectivo`
            : `AND mt.ano_lectivo IN (
        SELECT DISTINCT cf.CODIGO_ANO_LECTIVO
        FROM fk2_tb_confirmacoes cf
        WHERE cf.codigo_matricula = :codigo_matricula
      )`;

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
      fi.CodigoProduto                              AS id_tipo_servico,
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
        });

        const data = [...results, ...generated];



        return {
            Mensalidades: toLowerCaseKeys(data),
            OutrosServicos: toLowerCaseKeys([]),
            anoAtual: 0,
            totalIVA: 0,
            percentagem_retencao: 0,
            totalDivida: 0,
            total_incidencia: 0,
            total_retencao: 0,
            size: 0,
            desconto: 0,
            precoTotal: 0,
            bolsa: 0,
            saldo_reset: 0,
            somaValorDividaRecurso: 0,
            somaDividaFacturas: 0
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
}
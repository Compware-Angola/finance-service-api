import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { obterMulta } from 'src/module/util/obter-multa';
import {
  BolseiroResult,
  CalcularDescontoParams,
  CalcularValorMensalidadeParams,
  MesTempResponse,
  ObterBolseiroParams,
} from './types';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { formatDisplay } from 'src/module/util/format-date';

import { TestMonthlyDTO } from './dto/test-monthly.dto';
@Injectable()
export class MonthlyFeesDiscountUtilService {
  constructor(private dataSource: DataSource) { }

  // ====================== DADOS DO ALUNO (ÚNICA QUERY) ======================
  private async obterDadosCompletosAluno(codigoMatricula: number) {
    const sql = `
      SELECT
        c.designacao           as curso,
        c.codigo               as codigo_curso,
        c.sigla                as sigla,
        c.duracao              as duracao_curso,
        p.codigo_turno         as turno,
        nvl(p.polo_id, 1)      as polo
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

  // ====================== DESCONTOS ======================

  private async obterBolseiro({
    anoLectivo,
    codigoMatricula,
    semestre,
  }: ObterBolseiroParams): Promise<BolseiroResult> {
    const sql = `
    SELECT desconto, isentar_multa
    FROM fk2_tb_bolseiros
    WHERE codigo_matricula = :codigoMatricula
      AND codigo_anolectivo = :anoLectivo
      AND semestre = :semestre
  `;

    try {
      const [row] = await this.dataSource.query(sql, {
        anoLectivo,
        codigoMatricula,
        semestre,
      } as any);

      if (!row) {
        return { bolseiro: false, desconto: 0, isentar_multa: false };
      }

      const desconto = Number(row.DESCONTO ?? row.desconto ?? 0);
      const isentar_multa =
        (row.ISENTAR_MULTA ?? row.isentar_multa)?.toUpperCase() === 'SIM';

      return {
        bolseiro: true,
        desconto: desconto === 0 ? 1 : desconto / 100,
        isentar_multa,
      };
    } catch (err) {
      throw new Error(
        `Erro ao obter bolseiro [matricula=${codigoMatricula}]: ${err.message}`,
      );
    }
  }

  private async obterDescontoNormal({
    anoLectivo,
    codigoMatricula,
    semestre,
    dataLimite,
  }: {
    anoLectivo: number;
    codigoMatricula: number;
    semestre: number;
    dataLimite: Date;
  }) {
    const dataStr = formatDisplay(dataLimite);
    const sql = `
      SELECT de.TAXA as VALOR_DESCONTO
      FROM FK2_TB_DESCONTOS_ALUNOO da
      INNER JOIN FK2_DESCONTOS_ESPECIAIS de ON da.TIPO_TAXA_DESCONTO_ESPECIAL	 = de.id
      WHERE da.codigo_matricula = :codigoMatricula
        AND da.codigo_anolectivo = :anoLectivo
        AND da.afectacao = 'Pagamento de Propina'
        AND (da.semestre = :semestre OR da.semestre = 3)
        AND da.deleted_at IS NULL
        AND da.ESTATUS_DESCONTO_ID = 1
        AND de.ESTADO = 1
        AND TO_DATE(:dataStr, 'YYYY-MM-DD') BETWEEN de.DATA_INICIO AND de.DATA_FIM
      FETCH FIRST 1 ROW ONLY
    `;

    const [row] = await this.dataSource.query(sql, {
      anoLectivo,
      codigoMatricula,
      semestre,
      dataStr,
    } as any);

    if (row?.VALOR_DESCONTO != null) {
      return {
        temDesconto: true,
        desconto: Number(row.VALOR_DESCONTO) / 100,
      };
    }
    return { temDesconto: false, desconto: 0 };
  }

  private async obterDescontoEspecial(
    codigoMatricula: number,
    dataInicial: Date,
  ) {
    const dataStr = formatDisplay(dataInicial);

    const sql = `
      WITH aluno AS (
        SELECT c.sigla, p.codigo_turno as turno, p.anolectivo as anolectivo
        FROM fk2_tb_matriculas m
        JOIN fk2_tb_cursos c ON c.codigo = m.codigo_curso
        JOIN fk2_tb_admissao a ON a.codigo = m.codigo_aluno
        JOIN fk2_tb_preinscricao p ON p.codigo = a.pre_incricao
        WHERE m.codigo = :codigoMatricula
      )
      SELECT de.TAXA
      FROM aluno a
      JOIN FK2_DESCONTOS_ESPECIAIS de
        ON de.ESTADO = 1
       AND TO_DATE(:dataStr, 'YYYY-MM-DD') BETWEEN de.DATA_INICIO AND de.DATA_FIM
      WHERE (a.sigla = 'EAP' AND de.SIGLA = 'DAP50_AGRO_2324' AND a.anolectivo = 21)
         OR (a.turno = 6 AND de.SIGLA = 'DEN20_POSLAB')
      FETCH FIRST 1 ROW ONLY
    `;

    const [row] = await this.dataSource.query(sql, {
      codigoMatricula,
      dataStr,
    } as any);

    if (row?.TAXA != null) {
      return {
        temDesconto: true,
        desconto: Number(row.TAXA) / 100,
      };
    }

    return { temDesconto: false, desconto: 0 };
  }

  private async obterDescontoFinalista(
    codigoMatricula: number,
    anoLectivo: number,
    duracaoCurso: number,
  ) {
    const sql = `
      SELECT
        COUNT(*) AS total_cadeiras,
        MAX(cl.codigo) AS ano_inscrito
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
      LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc ON ftgc.codigo = ftgca.codigo_grade_curricular
      LEFT JOIN FK2_TB_CLASSES cl ON cl.codigo = ftgc.codigo_classe
      WHERE ftgca.codigo_status_grade_curricular IN (2, 3)
        AND ftgca.codigo_matricula = :codigoMatricula
        AND ftgca.codigo_ano_lectivo = :anoLectivo
    `;

    const [row] = await this.dataSource.query(sql, {
      codigoMatricula,
      anoLectivo,
    } as any);

    const anoInscrito = Number(row?.ANO_INSCRITO || 0);
    const totalCadeiras = Number(row?.TOTAL_CADEIRAS || 0);

    if (anoInscrito !== duracaoCurso) {
      return { temDesconto: false, desconto: 0 };
    }

    if (totalCadeiras > 0 && totalCadeiras < 5) {
      return { temDesconto: true, desconto: 0.5 };
    }

    return { temDesconto: false, desconto: 0 };
  }

  private async obterMensalidade(
    codigoMatricula: number,
    anoLectivo: number,
    dadosAluno: any,
  ): Promise<{ codigo_servico: number; preco: number; descricao: string }> {
    const sql = `
      SELECT PRECO,CODIGO,DESCRICAO
      FROM FK2_TB_TIPO_SERVICOS
      WHERE DESCRICAO LIKE 'Propina ' || :curso || '%'
        AND CODIGO_ANO_LECTIVO = :anoLectivo
        AND POLO_ID = :polo
        AND ESTADO = 'Ativo'
      ORDER BY DATA DESC
      FETCH FIRST 1 ROW ONLY
    `;

    const [row] = await this.dataSource.query(sql, {
      curso: dadosAluno.curso,
      polo: dadosAluno.polo,
      anoLectivo,
    } as any);

    if (!row?.PRECO) {
      throw new BadRequestException('Nenhuma mensalidade encontrada');
    }

    return {
      preco: Number(row.PRECO),
      codigo_servico: Number(row.CODIGO),
      descricao: row.DESCRICAO,
    };
  }

  // ====================== CÁLCULO DE DESCONTO ======================
  private async calcularDesconto({
    anoLectivo,
    codigoMatricula,
    mesTemp,
    dadosAluno,
  }: CalcularDescontoParams & { dadosAluno: any }): Promise<number> {
    // 1. Bolseiro (maior prioridade)
    const bolseiro = await this.obterBolseiro({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre,
    });
    if (bolseiro.bolseiro) return bolseiro.desconto;

    // 2. Desconto Especial
    const descontoEspecial = await this.obterDescontoEspecial(
      codigoMatricula,
      mesTemp.data_limite,
    );
    if (descontoEspecial.temDesconto) return descontoEspecial.desconto;

    // 3. Desconto Normal
    const descontoNormal = await this.obterDescontoNormal({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre,
      dataLimite: mesTemp.data_limite,
    });
    if (descontoNormal.temDesconto) return descontoNormal.desconto;

    // 4. Desconto Finalista
    /*
    const descontoFinalista = await this.obterDescontoFinalista(
      codigoMatricula,
      anoLectivo,
      dadosAluno.duracao_curso,
    );
    if (descontoFinalista.temDesconto) return descontoFinalista.desconto;
    */
    return 0;
  }

  // ====================== ISENÇÕES ======================
  private async existIsencaoMulta(
    codigoMatricula: number,
    mesTempId: number,
  ): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_ISENCOE_MULTA
      WHERE MES_TEMP_ID = :mesTempId
        AND CODIGO_MATRICULA = :codigoMatricula
        AND UPPER(ESTADO_ISENSAO) = 'ACTIVO'
    `;

    const [row] = await this.dataSource.query(sql, {
      codigoMatricula,
      mesTempId,
    } as any);
    return Number(row?.TOTAL || 0) > 0;
  }

  private async existIsencaoMensalidade(
    codigoMatricula: number,
    mesTempId: number,
  ): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_ISENCOES
      WHERE MES_TEMP_ID = :mesTempId
        AND CODIGO_MATRICULA = :codigoMatricula
        AND UPPER(ESTADO_ISENSAO) = 'ACTIVO'
    `;

    const [row] = await this.dataSource.query(sql, {
      codigoMatricula,
      mesTempId,
    } as any);
    return Number(row?.TOTAL || 0) > 0;
  }

  private async calcularPercentagemMulta(
    codigoMatricula: number,
    mesTemp: MesTempResponse,
    periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[],
  ): Promise<number> {
    const temIsencao = await this.existIsencaoMulta(
      codigoMatricula,
      mesTemp.id,
    );
    if (temIsencao) return 0;

    return obterMulta(mesTemp.data_limite, periodosIsentos);
  }

  private async obterStatusPagamento(
    isBolseiroIntegral: boolean,
    codigoMatricula: number,
    mesTempId: number,
  ): Promise<number> {
    if (isBolseiroIntegral) return 1;

    const temIsencao = await this.existIsencaoMensalidade(
      codigoMatricula,
      mesTempId,
    );
    return temIsencao ? 4 : 0;
  }

  // ====================== CÁLCULO FINAL ======================
  private async calcularValorMensalidade({
    anoLectivo,
    codigoMatricula,
    mesTemp,
    periodosIsentos,
    dadosAluno,
  }: CalcularValorMensalidadeParams & { dadosAluno: any }) {
    const mensalidade = await this.obterMensalidade(
      codigoMatricula,
      anoLectivo,
      dadosAluno,
    );

    const percentagemDesconto = await this.calcularDesconto({
      anoLectivo,
      codigoMatricula,
      mesTemp,
      dadosAluno,
    });

    const bolseiroInfo = await this.obterBolseiro({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre,
    });

    const isBolseiroIntegral = bolseiroInfo.desconto === 1;
    const statusPagamento = await this.obterStatusPagamento(
      isBolseiroIntegral,
      codigoMatricula,
      mesTemp.id,
    );

    const descontoValor = mensalidade.preco * percentagemDesconto;
    const mensalidadeComDesconto = mensalidade.preco - descontoValor;

    // Se for Bolseiro sem Multa nao deve calcular mas a Multa

    let percentagemMulta = 0;
    const temMesesSemMulta = await this.obterMesesSemMulta(
      mesTemp.ano_lectivo,
      mesTemp.id,
    );


    if (!bolseiroInfo.isentar_multa && !temMesesSemMulta) {
      percentagemMulta = await this.calcularPercentagemMulta(
        codigoMatricula,
        mesTemp,
        periodosIsentos,
      );
    }
    const multa = mensalidadeComDesconto * percentagemMulta;
    const valorFinal = mensalidadeComDesconto + multa;
    const valorPago = isBolseiroIntegral ? mensalidade.preco : 0;
    return {
      mes_temp_id: mesTemp.id,
      mes: mesTemp.designacao,
      data_inicial: mesTemp.data_inicial,
      data_final: mesTemp.data_final,
      data_limite: mesTemp.data_limite,
      id_item: 0,
      codigo_matricula: codigoMatricula,
      ano_lectivo_fatura: anoLectivo,
      estado_fatura: statusPagamento,
      ValorAPagar: valorFinal,
      valorEntregue: 0,
      data_vencimento: mesTemp.data_limite,
      desconto: descontoValor,
      codigo_factura: null,
      semestre: mesTemp.semestre,
      multa: multa,
      total_item: valorFinal,
      valor_pago: valorPago,
      mensalidade: mensalidade.preco,
      codigo_servico: mensalidade.codigo_servico,
      descricao_servico: mensalidade.descricao,
      total: valorFinal,
      total_preco: mensalidade.preco,
      status_pagamento: statusPagamento,
      data_operacao: null,
      data_pagamento: null
    };
  }

  private async obterMesesSemMulta(anoLectivo: number, mesTempId: number): Promise<boolean> {
    const sql = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_MESES_SEM_MULTA TSM
    WHERE TSM.ANO_LECTIVO = :anoLectivo
      AND TSM.MES_TEMP_ID = :mesTempId
      AND TSM.ESTADO = 1
  `;

    const result = await this.dataSource.query(sql, {
      anoLectivo,
      mesTempId,
    } as any);

    const total = Number(result[0]?.TOTAL ?? 0);
    return total > 0;
  }

  // ====================== MÉTODO PRINCIPAL ======================
  async generatePayment({
    codAnoLectivo,
    codigo_matricula,
    status = 'all',
  }: TestMonthlyDTO) {
    const dadosAluno = await this.obterDadosCompletosAluno(codigo_matricula);

    // ====================== QUERY DINÂMICA ======================
    const isAnoLectivoNumero =
      codAnoLectivo !== undefined &&
      codAnoLectivo !== null &&
      !isNaN(Number(codAnoLectivo));

    const sqlMesTemp = isAnoLectivoNumero
      ? `
    SELECT
      DATA_LIMITE, DATA_FINAL, DATA_INICIAL,
      SEMESTRE, ID, DESIGNACAO, PRESTACAO, ANO_LECTIVO
    FROM fk2_mes_temp tp
    WHERE tp.ano_lectivo = :codAnoLectivo
      AND tp.activo = 1
      AND tp.id NOT IN (
        SELECT it.mes_temp_id
        FROM fk2_factura ft
        INNER JOIN fk2_factura_items it ON ft.codigo = it.codigofactura
        INNER JOIN fk2_mes_temp mt ON mt.id = it.mes_temp_id
        WHERE ft.codigomatricula = :codigo_matricula
          AND it.mes_temp_id IS NOT NULL
          AND mt.ano_lectivo = :codAnoLectivo
          AND ft.estado != 3
      )
  `
      : `
  SELECT
  DATA_LIMITE, DATA_FINAL, DATA_INICIAL,
  SEMESTRE, ID, DESIGNACAO, PRESTACAO, ANO_LECTIVO
FROM fk2_mes_temp tp
WHERE tp.activo = 1
  AND tp.ano_lectivo IN (
    -- Apenas anos lectivos onde o aluno tem confirmação
    SELECT DISTINCT cf.CODIGO_ANO_LECTIVO
    FROM fk2_tb_confirmacoes cf
    WHERE cf.codigo_matricula = :codigo_matricula
  )
  AND tp.id NOT IN (
    SELECT it.mes_temp_id
    FROM fk2_factura ft
    INNER JOIN fk2_factura_items it ON ft.codigo = it.codigofactura
    INNER JOIN fk2_mes_temp mt ON mt.id = it.mes_temp_id
    WHERE ft.codigomatricula = :codigo_matricula
      AND it.mes_temp_id IS NOT NULL
      AND ft.estado != 3
  )
  `;

    const queryParams = codAnoLectivo
      ? { codAnoLectivo, codigo_matricula }
      : { codigo_matricula };

    const resultado = await this.dataSource.query(
      sqlMesTemp,
      queryParams as any,
    );
    const mesTemps: MesTempResponse[] = toLowerCaseKeys(resultado);

    const periodosIsentos = await this.dataSource.query(`
    SELECT DATA_INICIO, DATA_FIM
    FROM FK2_TB_DIAS_ISENTOS
    WHERE ESTADO = 1
  `);

    const pagamentos: any[] = [];

    for (const mesTemp of mesTemps) {

      const anoLectivoEfetivo = codAnoLectivo ?? mesTemp.ano_lectivo;

      const pagamento = await this.calcularValorMensalidade({
        anoLectivo: anoLectivoEfetivo,
        codigoMatricula: codigo_matricula,
        mesTemp,
        periodosIsentos,
        dadosAluno,
      });

      if (
        status === 'all' ||
        (status === 'pending' && pagamento.status_pagamento === 0) ||
        (status === 'paid' && pagamento.status_pagamento === 1)
      ) {
        pagamentos.push(pagamento);
      }
    }
    return pagamentos;
  }
}

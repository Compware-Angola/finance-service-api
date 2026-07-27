import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { resolverDescontobolseiro } from 'src/module/util/calcular-desconto-bolseiro';
import { PostgraduatePaymentDTO } from './dto/monthly-fee-posgraduation.dto';
import {
  PostgraduateBolseiroResult,
  PostgraduateDescontoResult,
  PostgraduateMesTempResponse,
  ObterBolseiroPosGraduacaoParams,
  CalcularDescontoPosGraduacaoParams,
  CalcularValorMensalidadePosGraduacaoParams,
} from './types/monthly-fee-posgraduation.types';

@Injectable()
export class MonthlyFeePosGraduationService {
  constructor(private dataSource: DataSource) {}

  private async obterDadosCompletosAlunoPosGraduacao(codigoMatricula: number) {
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

  private async obterMensalidadePosGraduacao(
    codigoMatricula: number,
    anoLectivo: number,
    dadosAluno: any,
  ): Promise<{ codigo_servico: number; preco: number; descricao: string }> {
    const sql = `
      SELECT PRECO, CODIGO, DESCRICAO
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
      throw new BadRequestException(
        'Nenhuma mensalidade de pós-graduação encontrada',
      );
    }

    return {
      preco: Number(row.PRECO),
      codigo_servico: Number(row.CODIGO),
      descricao: row.DESCRICAO,
    };
  }

  private async obterBolseiroPosGraduacao({
    anoLectivo,
    codigoMatricula,
    mensalidade,
    semestre,
  }: ObterBolseiroPosGraduacaoParams): Promise<PostgraduateBolseiroResult> {
    const sql = `
      SELECT
        b.desconto        AS DESCONTO,
        bo.valor_desconto AS VALOR_DESCONTO,
        db.sigla,
        b.codigo_bolsa,
        b.instituicao_pagou,
        b.codigo,
        b.semestre
      FROM fk2_tb_bolseiros b
      LEFT JOIN fk2_tb_bolsas bo
        ON bo.codigo = b.codigo_bolsa
      LEFT JOIN fk2_tb_tipo_desconto_bolsas db
        ON db.codigo = bo.codigo_tipo_desconto
      WHERE b.codigo_matricula = :codigoMatricula
        AND b.codigo_anolectivo = :anoLectivo
        AND (b.semestre = :semestre OR b.semestre = 3)
        AND b.STATUS_ = 1
    `;

    try {
      const [row] = await this.dataSource.query(sql, {
        anoLectivo,
        codigoMatricula,
        semestre,
      } as any);

      if (!row) {
        return {
          bolseiro: false,
          desconto: 0,
          instituicaoPagou: true,
          codigoBolseiro: null,
        };
      }

      const desconto = resolverDescontobolseiro(row, mensalidade);
      if (desconto == null) {
        return {
          bolseiro: false,
          desconto: 0,
          instituicaoPagou: true,
          codigoBolseiro: null,
        };
      }

      return {
        bolseiro: true,
        desconto: desconto === 0 ? 1 : desconto / 100,
        instituicaoPagou: Number(row.INSTITUICAO_PAGOU) === 1,
        codigoBolseiro: row.CODIGO,
      };
    } catch (err) {
      throw new Error(
        `Erro ao obter bolseiro de pós-graduação [matricula=${codigoMatricula}]: ${err.message}`,
      );
    }
  }

  private async obterDescontoNormalPosGraduacao({
    anoLectivo,
    codigoMatricula,
    semestre,
    dataLimite,
  }: {
    anoLectivo: number;
    codigoMatricula: number;
    semestre: number;
    dataLimite: Date;
  }): Promise<PostgraduateDescontoResult> {
    //const dataStr = this.formatarDataParaOracle(dataLimite);
    const sql = `
      SELECT de.TAXA as VALOR_DESCONTO
      FROM FK2_TB_DESCONTOS_ALUNOO da
      INNER JOIN FK2_DESCONTOS_ESPECIAIS de ON da.TIPO_TAXA_DESCONTO_ESPECIAL = de.id
      WHERE da.codigo_matricula = :codigoMatricula
        AND da.codigo_anolectivo = :anoLectivo
        AND da.afectacao = 'Pagamento de Propina'
        AND (da.semestre = :semestre OR da.semestre = 3)
        AND da.deleted_at IS NULL
        AND da.ESTATUS_DESCONTO_ID = 1
        AND de.ESTADO = 1
        ---AND TO_DATE(:dataStr, 'YYYY-MM-DD') BETWEEN de.DATA_INICIO AND de.DATA_FIM
      FETCH FIRST 1 ROW ONLY
    `;

    const [row] = await this.dataSource.query(sql, {
      anoLectivo,
      codigoMatricula,
      semestre,
      //dataStr,
    } as any);

    if (row?.VALOR_DESCONTO != null) {
      return { temDesconto: true, desconto: Number(row.VALOR_DESCONTO) / 100 };
    }
    return { temDesconto: false, desconto: 0 };
  }

  private async obterDescontoEspecialPosGraduacao(
    codigoMatricula: number,
    dataInicial: Date,
  ): Promise<PostgraduateDescontoResult> {
    return { temDesconto: false, desconto: 0 };
  }

  private async calcularDescontoPosGraduacao({
    anoLectivo,
    codigoMatricula,
    mensalidade,
    mesTemp,
  }: CalcularDescontoPosGraduacaoParams): Promise<number> {
    const bolseiro = await this.obterBolseiroPosGraduacao({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre_posgraduacao,
      mensalidade,
    });
    if (bolseiro.bolseiro) return bolseiro.desconto;

    const descontoNormal = await this.obterDescontoNormalPosGraduacao({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre_posgraduacao,
      dataLimite: mesTemp.data_limite,
    });
    if (descontoNormal.temDesconto) return descontoNormal.desconto;

    const descontoEspecial = await this.obterDescontoEspecialPosGraduacao(
      codigoMatricula,
      mesTemp.data_limite,
    );
    if (descontoEspecial.temDesconto) return descontoEspecial.desconto;

    return 0;
  }

  private async existeIsencaoMensalidadePosGraduacao(
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

  private async obterStatusPagamentoPosGraduacao(
    isPago: boolean,
    codigoMatricula: number,
    mesTempId: number,
  ): Promise<number> {
    if (isPago) return 1;

    const temIsencao = await this.existeIsencaoMensalidadePosGraduacao(
      codigoMatricula,
      mesTempId,
    );
    return temIsencao ? 4 : 0;
  }

  private async calcularValorMensalidadePosGraduacao({
    anoLectivo,
    codigoMatricula,
    mesTemp,
    dadosAluno,
  }: CalcularValorMensalidadePosGraduacaoParams) {
    const arredondar = (n: number) => parseFloat(n.toFixed(2));

    const mensalidade = await this.obterMensalidadePosGraduacao(
      codigoMatricula,
      anoLectivo,
      dadosAluno,
    );

    const percentagemDesconto = await this.calcularDescontoPosGraduacao({
      anoLectivo,
      codigoMatricula,
      mesTemp,
      mensalidade: mensalidade.preco,
    });

    const bolseiroInfo = await this.obterBolseiroPosGraduacao({
      anoLectivo,
      codigoMatricula,
      semestre: mesTemp.semestre_posgraduacao,
      mensalidade: mensalidade.preco,
    });

    const isBolseiroIntegral = bolseiroInfo.desconto === 1;
    const isDescontoTotal = percentagemDesconto === 1;
    const isPago = isBolseiroIntegral || isDescontoTotal;

    const statusPagamento = await this.obterStatusPagamentoPosGraduacao(
      isPago,
      codigoMatricula,
      mesTemp.id,
    );

    const descontoValor = arredondar(mensalidade.preco * percentagemDesconto);
    const mensalidadeComDesconto = arredondar(
      mensalidade.preco - descontoValor,
    );
    const valorPago = isPago ? mensalidade.preco : 0;

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
      ValorAPagar: mensalidadeComDesconto,
      valorEntregue: 0,
      data_vencimento: mesTemp.data_limite,
      desconto: descontoValor,
      codigo_factura: null,
      semestre: mesTemp.semestre_posgraduacao,
      total_item: mensalidadeComDesconto,
      valor_pago: valorPago,
      mensalidade: mensalidade.preco,
      codigo_servico: mensalidade.codigo_servico,
      descricao_servico: mensalidade.descricao,
      total: mensalidadeComDesconto,
      total_preco: mensalidade.preco,
      status_pagamento: statusPagamento,
      data_operacao: null,
      data_pagamento: null,
      instituicao_pagou: bolseiroInfo.instituicaoPagou ?? true,
      codigo_bolseiro: bolseiroInfo.codigoBolseiro,
      observacao:
        bolseiroInfo.instituicaoPagou === false
          ? 'Instituição não pagou a bolsa. Estudante deve pagar o valor integral.'
          : null,
    };
  }

  async gerarPagamentosPosGraduacao({
    codAnoLectivo,
    codigo_matricula,
  }: PostgraduatePaymentDTO) {
    const dadosAluno =
      await this.obterDadosCompletosAlunoPosGraduacao(codigo_matricula);

    const sqlMesTemp = this.montarQueryMesTempPosGraduacao();

    const queryParams = { codAnoLectivo, codigo_matricula };

    const resultado = await this.dataSource.query(
      sqlMesTemp,
      queryParams as any,
    );
    const mesTemps: PostgraduateMesTempResponse[] = toLowerCaseKeys(resultado);

    const pagamentos: any[] = [];

    for (const mesTemp of mesTemps) {
      const anoLectivoEfetivo = codAnoLectivo ?? mesTemp.ano_lectivo;

      const pagamento = await this.calcularValorMensalidadePosGraduacao({
        anoLectivo: anoLectivoEfetivo,
        codigoMatricula: codigo_matricula,
        mesTemp,
        dadosAluno,
      });
      pagamentos.push(pagamento);
    }

    return pagamentos;
  }

  private montarQueryMesTempPosGraduacao(): string {
    return `
      SELECT
        DATA_LIMITE, DATA_FINAL, DATA_INICIAL,
        SEMESTRE_POSGRADUACAO, ID, DESIGNACAO, PRESTACAO, ANO_LECTIVO
      FROM fk2_mes_temp tp
      WHERE tp.ACTIVO_POSGRADUACAO = 1
        AND EXISTS (
          SELECT 1
          FROM fk2_tb_confirmacoes cf
          INNER JOIN fk2_tb_ano_lectivo a ON a.codigo = cf.CODIGO_ANO_LECTIVO
          WHERE cf.codigo_matricula = :codigo_matricula
            AND cf.CODIGO_ANO_LECTIVO = tp.ano_lectivo
            AND TRIM(UPPER(a.estado)) != 'ACTIVO'
        )
        AND tp.id NOT IN (
          SELECT it.mes_temp_id
          FROM fk2_factura ft
          INNER JOIN fk2_factura_items it ON ft.codigo = it.codigofactura
          INNER JOIN fk2_mes_temp mt ON mt.id = it.mes_temp_id
          WHERE ft.codigomatricula = :codigo_matricula
            AND it.mes_temp_id IS NOT NULL
            AND ft.estado != 3
            AND mt.ano_lectivo = :codAnoLectivo
        )
      ORDER BY tp.PRESTACAO ASC
    `;
  }

  // ====================== HELPERS ======================

  private formatarDataParaOracle(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}

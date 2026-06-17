import { Injectable } from '@nestjs/common';
import { CreatePagamentosBolsaInstituicaoDto } from './dto/create-pagamentos_bolsa_instituicao.dto';
import { UpdatePagamentosBolsaInstituicaoDto } from './dto/update-pagamentos_bolsa_instituicao.dto';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { FindPagamentoBolsaDto } from './dto/find-pagamento-bolsa.dto';
import { FindEstudantesPorBolsaDto } from './dto/find-estudantes-por-bolsa.dto';

// Número de meses cobertos por cada semestre
const MESES_POR_SEMESTRE: Record<number, number> = { 1: 5, 2: 5, 3: 10 };

@Injectable()
export class PagamentosBolsaInstituicaoService {
  constructor(private readonly dataSource: DataSource) { }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  async create(dto: CreatePagamentosBolsaInstituicaoDto, codigoUtilizador: number) {
    // 1. Validar bolsa e obter instituição associada
    const [bolsa] = await this.dataSource.query(
      `SELECT b.CODIGO, b.DESIGNACAO, b.CODIGO_INSTITUICAO, i.INSTITUICAO
       FROM FK2_TB_BOLSAS b
       LEFT JOIN FK2_TB_INSTITUICAO i ON i.CODIGO = b.CODIGO_INSTITUICAO
       WHERE b.CODIGO = :codigoBolsa`,
      { codigoBolsa: dto.codigoBolsa } as any,
    );

    if (!bolsa) {
      throw new NotFoundException(
        `Bolsa com código ${dto.codigoBolsa} não encontrada`,
      );
    }

    if (!bolsa.CODIGO_INSTITUICAO) {
      throw new BadRequestException(
        `A bolsa ${dto.codigoBolsa} não tem instituição associada`,
      );
    }

    // 2. Verificar duplicado (mesma bolsa + ano + semestre)
    const [jaExiste] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO
       WHERE BOLSA_ID   = :codigoBolsa
         AND ANO_LECTIVO    = :anoLectivo
         AND SEMESTRE       = :semestre
         AND ESTADO         = 1`,
      {
        codigoBolsa: dto.codigoBolsa,
        anoLectivo: dto.anoLectivo,
        semestre: dto.semestre,
      } as any,
    );

    if (jaExiste) {
      throw new BadRequestException(
        `Já existe um pagamento registado para esta bolsa no período indicado`,
      );
    }

    // 3. INSERT
    await this.dataSource.query(
      `INSERT INTO FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO (
      BOLSA_ID,
      ANO_LECTIVO,
      SEMESTRE,
      VALOR_DEPOSITADO,
      DATA_DEPOSITO,
      REFERENCIA,
      OBSERVACAO,
      CODIGO_UTILIZADOR,
      ESTADO,
      CREATED_AT
   ) VALUES (
      :bolsa_id,
      :anoLectivo,
      :semestre,
      :valorDepositado,
      TO_DATE(:dataDeposito, 'YYYY-MM-DD'),
      :referencia,
      :observacao,
      :codigoUtilizador,
      1,
      SYSDATE
   )`,
      {
        bolsa_id: dto.codigoBolsa,
        anoLectivo: dto.anoLectivo,
        semestre: dto.semestre,
        valorDepositado: dto.valorDepositado,
        dataDeposito: dto.dataDeposito,
        referencia: dto.referencia ?? null,
        observacao: dto.observacao ?? null,
        codigoUtilizador,
      } as any,
    );
    return {
      statusCode: 201,
      message: 'Pagamento registado com sucesso',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  async update(codigo: number, dto: UpdatePagamentosBolsaInstituicaoDto, codigoUtilizador: number) {
    const [pagamento] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO WHERE CODIGO = :codigo`,
      { codigo } as any,
    );

    if (!pagamento) {
      throw new NotFoundException(`Pagamento com código ${codigo} não encontrado`);
    }

    await this.dataSource.query(
      `UPDATE FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO SET
          BOLSA_ID         = NVL(:codigoBolsa,     BOLSA_ID),
          ANO_LECTIVO      = NVL(:anoLectivo,      ANO_LECTIVO),
          SEMESTRE         = NVL(:semestre,        SEMESTRE),
          VALOR_DEPOSITADO = NVL(:valorDepositado, VALOR_DEPOSITADO),
          DATA_DEPOSITO    = NVL(TO_DATE(:dataDeposito, 'YYYY-MM-DD'), DATA_DEPOSITO),
          REFERENCIA       = NVL(:referencia,      REFERENCIA),
          OBSERVACAO       = NVL(:observacao,      OBSERVACAO),
          CODIGO_UTILIZADOR= :codigoUtilizador,
          UPDATED_AT       = SYSDATE
       WHERE CODIGO = :codigo`,
      {
        codigoBolsa: dto.codigoBolsa ?? null,
        anoLectivo: dto.anoLectivo ?? null,
        semestre: dto.semestre ?? null,
        valorDepositado: dto.valorDepositado ?? null,
        dataDeposito: dto.dataDeposito ?? null,
        referencia: dto.referencia ?? null,
        observacao: dto.observacao ?? null,
        codigoUtilizador,
        codigo,
      } as any,
    );

    return { statusCode: 200, message: 'Pagamento actualizado com sucesso' };
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE LÓGICO
  // ─────────────────────────────────────────────────────────────
  async remove(codigo: number) {
    const [pagamento] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO WHERE CODIGO = :codigo AND DELETED_AT IS NULL`,
      { codigo } as any,
    );

    if (!pagamento) {
      throw new NotFoundException(`Pagamento com código ${codigo} não encontrado`);
    }

    await this.dataSource.query(
      `UPDATE FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO SET DELETED_AT = SYSDATE, ESTADO = 0 WHERE CODIGO = :codigo`,
      { codigo } as any,
    );

    return { statusCode: 200, message: 'Pagamento removido com sucesso' };
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────
  async findOne(codigo: number) {
    const [row] = await this.dataSource.query(
      `SELECT
          p.CODIGO,
          p.BOLSA_ID,
          b.DESIGNACAO            AS BOLSA,
          b.CODIGO_INSTITUICAO,
          i.INSTITUICAO,
          p.ANO_LECTIVO,
          p.SEMESTRE,
          p.VALOR_DEPOSITADO,
          p.DATA_DEPOSITO,
          p.REFERENCIA,
          p.OBSERVACAO,
          p.ESTADO,
          p.CREATED_AT,
          p.UPDATED_AT
       FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p
       INNER JOIN FK2_TB_BOLSAS      b ON b.CODIGO = p.BOLSA_ID
       LEFT  JOIN FK2_TB_INSTITUICAO i ON i.CODIGO = b.CODIGO_INSTITUICAO
       WHERE p.CODIGO = :codigo AND p.DELETED_AT IS NULL`,
      { codigo } as any,
    );

    if (!row) {
      throw new NotFoundException(`Pagamento com código ${codigo} não encontrado`);
    }

    return toLowerCaseKeys(row);
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ALL  (listagem geral + conciliação)
  // ─────────────────────────────────────────────────────────────
  async findAll(query: FindPagamentoBolsaDto) {
    const {
      codigoBolsa,
      codigoInstituicao,
      anoLectivo,
      semestre,
      estado,
      nomeInstituicao,
      apenasSemPagamento,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    const params = {
      codigoBolsa: codigoBolsa ?? null,
      codigoInstituicao: codigoInstituicao ?? null,
      anoLectivo: anoLectivo ?? null,
      semestre: semestre ?? null,
      estado: estado ?? null,
      nomeInstituicao: nomeInstituicao ?? null,
    };

    // Filtro para bolsas sem pagamento
    const semPagamentoFilter =
      apenasSemPagamento === 1 ? `AND p.CODIGO IS NULL` : ``;

    const baseQuery = `
    FROM FK2_TB_BOLSAS b
    INNER JOIN FK2_TB_INSTITUICAO i 
        ON i.CODIGO = b.CODIGO_INSTITUICAO

    INNER JOIN FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p 
        ON p.BOLSA_ID = b.CODIGO

    LEFT JOIN FK2_TB_ANO_LECTIVO al 
        ON al.CODIGO = p.ANO_LECTIVO

    LEFT JOIN (
        SELECT
          bs.CODIGO_BOLSA,
          COUNT(bs.CODIGO) AS QTD_BOLSEIROS
        FROM FK2_TB_BOLSEIROS bs
        WHERE bs.STATUS_ = 1
          AND (:anoLectivo IS NULL OR bs.CODIGO_ANOLECTIVO = :anoLectivo)
          AND (:semestre IS NULL OR bs.SEMESTRE = :semestre)
        GROUP BY bs.CODIGO_BOLSA
    ) resumo ON resumo.CODIGO_BOLSA = b.CODIGO

    WHERE b.STATUS = 1
      AND p.DELETED_AT IS NULL
      AND (:codigoBolsa IS NULL OR b.CODIGO = :codigoBolsa)
      AND (:codigoInstituicao IS NULL OR b.CODIGO_INSTITUICAO = :codigoInstituicao)
      AND (:estado IS NULL OR p.ESTADO = :estado)
      AND (:nomeInstituicao IS NULL OR UPPER(i.INSTITUICAO) LIKE '%' || UPPER(:nomeInstituicao) || '%')
      AND (:anoLectivo IS NULL OR p.ANO_LECTIVO = :anoLectivo)
      AND (:semestre IS NULL OR p.SEMESTRE = :semestre)
      ${semPagamentoFilter}
  `;

    const [dataResult, totalResult] = await Promise.all([
      this.dataSource.query(
        `
      SELECT
        b.CODIGO AS CODIGO_BOLSA,
        b.DESIGNACAO AS BOLSA,
        i.CODIGO AS CODIGO_INSTITUICAO,
        i.INSTITUICAO,
        p.CODIGO AS CODIGO_PAGAMENTO,
        p.ANO_LECTIVO AS CODIGO_ANO_LETIVO,
        p.SEMESTRE,
        p.VALOR_DEPOSITADO,
        p.DATA_DEPOSITO,
        p.REFERENCIA,
        p.OBSERVACAO,
        p.ESTADO AS ESTADO_PAGAMENTO,
        p.CREATED_AT AS DATA_REGISTO,
        NVL(resumo.QTD_BOLSEIROS, 0) AS QTD_ESTUDANTES,
        al.DESIGNACAO AS ANO_LETIVO
      ${baseQuery}
      ORDER BY i.INSTITUICAO ASC, b.DESIGNACAO ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
        { ...params, offset, limit } as any,
      ),

      this.dataSource.query(
        `SELECT COUNT(*) AS TOTAL ${baseQuery}`,
        params as any,
      ),
    ]);

    const totalRecords = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(dataResult),
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // RESUMO POR INSTITUIÇÃO  (tela de conciliação / dashboard)
  // ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // HELPER PRIVADO — calcula valor esperado por bolsa
  //
  // Regras:
  //   DESC_FIX  → VALOR_DESCONTO já é o total em dinheiro
  //   DESC_PERC → (mensalidade do estudante × % desconto / 100) × nº meses × nº bolseiros
  // ─────────────────────────────────────────────────────────────
  private calcularValorEsperado(
    sigla: string,
    valorDesconto: number,
    qtdBolseiros: number,
    mensalidadeMedia: number,
    semestre: number,
  ): number {
    const meses = MESES_POR_SEMESTRE[semestre] ?? 5;

    if (sigla === 'DESC_FIX') {
      // Valor fixo total já definido na bolsa (cobre todos os bolseiros)
      return Number(valorDesconto);
    }

    // Percentual: cada bolseiro paga (mensalidade × %) por mês
    const descontoUnitarioPorMes = (mensalidadeMedia * Number(valorDesconto)) / 100;
    return descontoUnitarioPorMes * meses * qtdBolseiros;
  }

  // ─────────────────────────────────────────────────────────────
  // RESUMO POR INSTITUIÇÃO  (conciliação — sem insights)
  // ─────────────────────────────────────────────────────────────
  async resumoPorInstituicao(anoLectivo: number, semestre?: number) {
    if (!anoLectivo) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    const rows = await this.dataSource.query(
      `SELECT
        i.CODIGO                                    AS CODIGO_INSTITUICAO,
        i.INSTITUICAO,

        COUNT(DISTINCT b.CODIGO)                   AS QTD_BOLSAS,
        COUNT(DISTINCT bs.CODIGO)                  AS QTD_BOLSEIROS,

        NVL(p.VALOR_DEPOSITADO, 0)                 AS VALOR_DEPOSITADO,

        MAX(td.SIGLA)                             AS TIPO_DESCONTO_SIGLA,

        NVL(SUM(b.VALOR_DESCONTO), 0)             AS SOMA_VALOR_DESCONTO,

        MAX(b.VALOR_DESCONTO)                     AS PCT_DESCONTO,

        NVL(ts_media.MENSALIDADE_MEDIA, 0)        AS MENSALIDADE_MEDIA,

        :semestre                                 AS SEMESTRE_FILTRO

     FROM FK2_TB_INSTITUICAO i

     INNER JOIN FK2_TB_BOLSAS b
        ON b.CODIGO_INSTITUICAO = i.CODIGO

     LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS td
        ON td.CODIGO = b.CODIGO_TIPO_DESCONTO

     LEFT JOIN FK2_TB_BOLSEIROS bs
        ON bs.CODIGO_BOLSA = b.CODIGO
       AND bs.STATUS_ = 1
       AND bs.CODIGO_ANOLECTIVO = :anoLectivo
       AND (:semestre IS NULL OR bs.SEMESTRE = :semestre)

     -- 🔥 MENSALIDADE FORA DE DUPLICAÇÃO (CORRETO)
     LEFT JOIN (
          SELECT
              c2.CODIGO AS CURSO_ID,
              MAX(ts.PRECO) AS MENSALIDADE_MEDIA
          FROM FK2_TB_CURSOS c2
          LEFT JOIN FK2_TB_TIPO_SERVICOS ts
              ON ts.DESCRICAO LIKE 'Propina ' || c2.DESIGNACAO || '%'
             AND ts.CODIGO_ANO_LECTIVO = :anoLectivo
             AND ts.ESTADO = 'Ativo'
          GROUP BY c2.CODIGO
     ) ts_media
        ON ts_media.CURSO_ID = (
            SELECT m.CODIGO_CURSO
            FROM FK2_TB_MATRICULAS m
            WHERE m.CODIGO = bs.CODIGO_MATRICULA
            FETCH FIRST 1 ROWS ONLY
        )

     -- 🔥 PAGAMENTOS (OK)
     LEFT JOIN (
          SELECT
              BOLSA_ID,
              SUM(VALOR_DEPOSITADO) AS VALOR_DEPOSITADO
          FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO
          WHERE ANO_LECTIVO = :anoLectivo
            AND DELETED_AT IS NULL
            AND (:semestre IS NULL OR SEMESTRE = :semestre)
          GROUP BY BOLSA_ID
     ) p
        ON p.BOLSA_ID = b.CODIGO

     GROUP BY
        i.CODIGO,
        i.INSTITUICAO,
        p.VALOR_DEPOSITADO,
        ts_media.MENSALIDADE_MEDIA

     ORDER BY i.INSTITUICAO ASC`,
      { anoLectivo, semestre: semestre ?? null } as any,
    );

    const semestreEfetivo = semestre ?? 1;

    const data = toLowerCaseKeys(rows).map((r: any) => {
      const valorEsperado = this.calcularValorEsperado(
        r.tipo_desconto_sigla ?? 'DESC_PERC',
        r.tipo_desconto_sigla === 'DESC_FIX'
          ? r.soma_valor_desconto
          : r.pct_desconto,
        Number(r.qtd_bolseiros),
        Number(r.mensalidade_media),
        semestreEfetivo,
      );

      const valorDepositado = Number(r.valor_depositado || 0);

      const diferenca = valorDepositado - valorEsperado;

      const pctDivergencia =
        valorEsperado > 0
          ? +((diferenca / valorEsperado) * 100).toFixed(2)
          : 0;

      let statusConciliacao: string;

      if (valorDepositado === 0) {
        statusConciliacao = 'Sem pagamento';
      } else if (Math.abs(pctDivergencia) >= 5) {
        statusConciliacao = 'Divergência significativa';
      } else if (Math.abs(pctDivergencia) > 0) {
        statusConciliacao = 'Divergência leve';
      } else {
        statusConciliacao = 'Conciliado';
      }

      return {
        codigo_instituicao: r.codigo_instituicao,
        instituicao: r.instituicao,
        bolsa: r.bolsa,
        qtd_bolsas: Number(r.qtd_bolsas),
        qtd_bolseiros: Number(r.qtd_bolseiros),
        tipo_desconto_sigla: r.tipo_desconto_sigla,
        mensalidade_media: Number(r.mensalidade_media),
        valor_depositado: valorDepositado,
        valor_esperado: +valorEsperado.toFixed(2),
        diferenca: +diferenca.toFixed(2),
        pct_divergencia: pctDivergencia,
        status_conciliacao: statusConciliacao,
      };
    });

    return { data };
  }
  // ─────────────────────────────────────────────────────────────
  // INSIGHTS  (rota separada GET /conciliacao/insights)
  // ─────────────────────────────────────────────────────────────
  async insights(anoLectivo: number, semestre?: number) {
    if (!anoLectivo) throw new BadRequestException('O ano lectivo é obrigatório');

    // Reutiliza o resumo já calculado (com os valores esperados correctos)
    const { data } = await this.resumoPorInstituicao(anoLectivo, semestre);

    const totalDepositado = data.reduce((s: number, r: any) => s + r.valor_depositado, 0);
    const totalEsperado = data.reduce((s: number, r: any) => s + r.valor_esperado, 0);
    const totalBolseiros = data.reduce((s: number, r: any) => s + r.qtd_bolseiros, 0);

    const comDivergenciaSignificativa = data.filter(
      (r: any) => r.status_conciliacao === 'Divergência significativa',
    ).length;

    const semPagamento = data.filter(
      (r: any) => r.status_conciliacao === 'Sem pagamento',
    ).length;

    const saudeConciliacao = totalEsperado > 0
      ? +((totalDepositado / totalEsperado) * 100).toFixed(2)
      : 0;

    // Crescimento vs período anterior (semestre/ano anterior)
    const periodoAnterior = await this.totalDepositadoPeriodoAnterior(anoLectivo, semestre);
    const crescimento = periodoAnterior > 0
      ? +(((totalDepositado - periodoAnterior) / periodoAnterior) * 100).toFixed(2)
      : 0;

    const instituicaoMaiorValor = data.reduce(
      (max: any, r: any) => (r.valor_depositado > (max?.valor_depositado ?? -1) ? r : max),
      null as any,
    );

    const instituicaoMaisBolseiros = data.reduce(
      (max: any, r: any) => (r.qtd_bolseiros > (max?.qtd_bolseiros ?? -1) ? r : max),
      null as any,
    );

    return {
      instituicaoMaiorValor: instituicaoMaiorValor
        ? { nome: instituicaoMaiorValor.instituicao, valor: instituicaoMaiorValor.valor_depositado }
        : null,
      instituicaoMaisBolseiros: instituicaoMaisBolseiros
        ? { nome: instituicaoMaisBolseiros.instituicao, qtd: instituicaoMaisBolseiros.qtd_bolseiros }
        : null,
      divergenciasFinanceiras: {
        label: 'Instituições com divergências financeiras',
        descricao: `${comDivergenciaSignificativa} instituição(ões) com divergência ≥ 5%`,
        valor: comDivergenciaSignificativa,
      },
      crescimentoVsPeriodoAnterior: {
        label: 'Crescimento vs período anterior',
        descricao: `${crescimento >= 0 ? '+' : ''}${crescimento}% ${crescimento >= 0 ? 'de aumento' : 'de redução'} nos pagamentos`,
        valor: crescimento,
      },
      tendenciaCustos: {
        label: 'Tendência dos custos das bolsas',
        descricao:
          totalDepositado < totalEsperado
            ? 'Custo total das bolsas em redução estimado para o próximo período'
            : 'Custo total das bolsas em crescimento estimado para o próximo período',
      },
      saudeConciliacao: {
        label: 'Saúde da conciliação',
        descricao: `${saudeConciliacao}% das verbas conciliadas com as bolsas calculadas`,
        valor: saudeConciliacao,
      },
      totais: {
        totalDepositado: +totalDepositado.toFixed(2),
        totalEsperado: +totalEsperado.toFixed(2),
        diferenca: +(totalDepositado - totalEsperado).toFixed(2),
        totalBolseiros,
        semPagamento,
        totalInstituicoes: data.length,
      },
    };
  }

  // Helper: total depositado no período anterior (ano anterior, mesmo semestre)
  private async totalDepositadoPeriodoAnterior(
    anoLectivo: number,
    semestre?: number,
  ): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT NVL(SUM(p.VALOR_DEPOSITADO), 0) AS TOTAL
       FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p
       WHERE p.ANO_LECTIVO = :anoAnterior
         AND (:semestre IS NULL OR p.SEMESTRE = :semestre)
         AND p.DELETED_AT IS NULL
         AND p.ESTADO = 1`,
      { anoAnterior: anoLectivo - 1, semestre: semestre ?? null } as any,
    );
    return Number(row?.TOTAL ?? 0);
  }
  // ─────────────────────────────────────────────────────────────
  // INSTITUIÇÕES SEM PAGAMENTO
  // ─────────────────────────────────────────────────────────────
  async instituicoesSemPagamento(anoLectivo: number, semestre?: number) {
    if (!anoLectivo) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    const rows = await this.dataSource.query(
      `SELECT
          i.CODIGO          AS CODIGO_INSTITUICAO,
          i.INSTITUICAO,
          COUNT(DISTINCT b.CODIGO)    AS QTD_BOLSAS,
          COUNT(DISTINCT bs.CODIGO)   AS QTD_BOLSEIROS
       FROM FK2_TB_INSTITUICAO i
       INNER JOIN FK2_TB_BOLSAS b
          ON b.CODIGO_INSTITUICAO = i.CODIGO
       LEFT JOIN FK2_TB_BOLSEIROS bs
          ON bs.CODIGO_BOLSA      = b.CODIGO
         AND bs.STATUS_           = 1
         AND bs.CODIGO_ANOLECTIVO = :anoLectivo
         AND (:semestre IS NULL OR bs.SEMESTRE = :semestre)
       
         AND NOT EXISTS (
           SELECT 1 FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p
           WHERE p.BOLSA_ID = b.CODIGO
             AND p.ANO_LECTIVO  = :anoLectivo
             AND (:semestre IS NULL OR p.SEMESTRE = :semestre)
             AND p.DELETED_AT IS NULL
         )
       GROUP BY i.CODIGO, i.INSTITUICAO
       ORDER BY i.INSTITUICAO ASC`,
      { anoLectivo, semestre: semestre ?? null } as any,
    );

    return { data: toLowerCaseKeys(rows), total: rows.length };
  }

  // ─────────────────────────────────────────────────────────────
  // ESTUDANTES POR BOLSA
  // ─────────────────────────────────────────────────────────────
  async estudantesPorBolsa(codigoBolsa: number, query: FindEstudantesPorBolsaDto) {
    const {
      anoLectivo,
      semestre,
      nome,
      curso,
      statusBolseiro,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    // Verificar se a bolsa existe
    const [bolsa] = await this.dataSource.query(
      `SELECT b.CODIGO, b.DESIGNACAO, i.INSTITUICAO
       FROM FK2_TB_BOLSAS b
       LEFT JOIN FK2_TB_INSTITUICAO i ON i.CODIGO = b.CODIGO_INSTITUICAO
       WHERE b.CODIGO = :codigoBolsa`,
      { codigoBolsa } as any,
    );

    if (!bolsa) {
      throw new NotFoundException(`Bolsa com código ${codigoBolsa} não encontrada`);
    }

    const params = {
      codigoBolsa,
      anoLectivo: anoLectivo ?? null,
      semestre: semestre ?? null,
      nome: nome ?? null,
      curso: curso ?? null,
      statusBolseiro: statusBolseiro ?? 1,
    };

    const whereClause = `
      WHERE bs.CODIGO_BOLSA = :codigoBolsa
        AND (:anoLectivo      IS NULL OR bs.CODIGO_ANOLECTIVO     = :anoLectivo)
        AND (:semestre        IS NULL OR bs.SEMESTRE              = :semestre)
        AND (:statusBolseiro  IS NULL OR bs.STATUS_               = :statusBolseiro)
        AND (:nome            IS NULL OR UPPER(pr.NOME_COMPLETO)  LIKE '%' || UPPER(:nome) || '%')
        AND (:curso           IS NULL OR UPPER(c.DESIGNACAO)      LIKE '%' || UPPER(:curso) || '%')
    `;

    const fromClause = `
      FROM FK2_TB_BOLSEIROS     bs
      INNER JOIN FK2_TB_MATRICULAS   m  ON m.CODIGO  = bs.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO     ad ON ad.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pr ON pr.CODIGO = ad.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS       c  ON c.CODIGO  = m.CODIGO_CURSO
      LEFT JOIN  FK2_TB_ANO_LECTIVO  al ON al.CODIGO = bs.CODIGO_ANOLECTIVO
    `;

    const [dataResult, totalResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
            bs.CODIGO                       AS CODIGO_BOLSEIRO,
            bs.CODIGO_MATRICULA,
            pr.NOME_COMPLETO                AS NOME,
            pr.BILHETE_IDENTIDADE           AS BI,
            c.DESIGNACAO                    AS CURSO,
            al.DESIGNACAO                   AS ANO_LECTIVO,
            bs.SEMESTRE,
            bs.STATUS_                      AS STATUS_BOLSEIRO,
            bs.DESCONTO,
            bs.DATA_INICIO_BOLSA,
            bs.DATA_FIM_BOLSA,
            bs.ISENTAR_MULTA,
            bs.CREATED_AT
         ${fromClause}
         ${whereClause}
         ORDER BY pr.NOME_COMPLETO ASC
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        { ...params, offset, limit } as any,
      ),

      this.dataSource.query(
        `SELECT COUNT(*) AS TOTAL ${fromClause} ${whereClause}`,
        params as any,
      ),
    ]);

    const totalRecords = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      bolsa: toLowerCaseKeys(bolsa),
      data: toLowerCaseKeys(dataResult),
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // ESTUDANTES POR INSTITUIÇÃO (independente da bolsa)
  // ─────────────────────────────────────────────────────────────
  async estudantesPorInstituicao(codigoInstituicao: number, query: FindEstudantesPorBolsaDto) {
    const { anoLectivo, semestre, nome, curso, statusBolseiro, page = 1, limit = 10 } = query;

    const offset = (page - 1) * limit;

    const [instituicao] = await this.dataSource.query(
      `SELECT CODIGO, INSTITUICAO FROM FK2_TB_INSTITUICAO WHERE CODIGO = :codigoInstituicao`,
      { codigoInstituicao } as any,
    );

    if (!instituicao) {
      throw new NotFoundException(`Instituição com código ${codigoInstituicao} não encontrada`);
    }

    const params = {
      codigoInstituicao,
      anoLectivo: anoLectivo ?? null,
      semestre: semestre ?? null,
      nome: nome ?? null,
      curso: curso ?? null,
      statusBolseiro: statusBolseiro ?? null,
    };

    const whereClause = `
      WHERE b.CODIGO_INSTITUICAO = :codigoInstituicao
        AND (:anoLectivo     IS NULL OR bs.CODIGO_ANOLECTIVO    = :anoLectivo)
        AND (:semestre       IS NULL OR bs.SEMESTRE             = :semestre)
        AND (:statusBolseiro IS NULL OR bs.STATUS_              = :statusBolseiro)
        AND (:nome           IS NULL OR UPPER(pr.NOME_COMPLETO) LIKE '%' || UPPER(:nome) || '%')
        AND (:curso          IS NULL OR UPPER(c.DESIGNACAO)     LIKE '%' || UPPER(:curso) || '%')
    `;

    const fromClause = `
      FROM FK2_TB_BOLSEIROS     bs
      INNER JOIN FK2_TB_BOLSAS       b  ON b.CODIGO  = bs.CODIGO_BOLSA
      INNER JOIN FK2_TB_MATRICULAS   m  ON m.CODIGO  = bs.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO     ad ON ad.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pr ON pr.CODIGO = ad.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS       c  ON c.CODIGO  = m.CODIGO_CURSO
      LEFT  JOIN FK2_TB_ANO_LECTIVO  al ON al.CODIGO = bs.CODIGO_ANOLECTIVO
    `;

    const [dataResult, totalResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
            bs.CODIGO                 AS CODIGO_BOLSEIRO,
            bs.CODIGO_MATRICULA,
            pr.NOME_COMPLETO          AS NOME,
            pr.BILHETE_IDENTIDADE     AS BI,
            c.DESIGNACAO              AS CURSO,
            b.DESIGNACAO              AS BOLSA,
            al.DESIGNACAO             AS ANO_LECTIVO,
            bs.SEMESTRE,
            bs.STATUS_                AS STATUS_BOLSEIRO,
            bs.DESCONTO,
            bs.DATA_INICIO_BOLSA,
            bs.DATA_FIM_BOLSA
         ${fromClause}
         ${whereClause}
         ORDER BY pr.NOME_COMPLETO ASC
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
        { ...params, offset, limit } as any,
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS TOTAL ${fromClause} ${whereClause}`,
        params as any,
      ),
    ]);

    const totalRecords = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      instituicao: toLowerCaseKeys(instituicao),
      data: toLowerCaseKeys(dataResult),
      meta: { total: totalRecords, page, limit, totalPages: Math.ceil(totalRecords / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // HISTÓRICO DE PAGAMENTOS DE UMA BOLSA
  // ─────────────────────────────────────────────────────────────
  async historicoPorBolsa(codigoBolsa: number) {
    const rows = await this.dataSource.query(
      `SELECT
          p.CODIGO,
          p.ANO_LECTIVO,
          p.SEMESTRE,
          p.VALOR_DEPOSITADO,
          p.DATA_DEPOSITO,
          p.REFERENCIA,
          p.OBSERVACAO,
          p.ESTADO,
          p.CREATED_AT
       FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p
       WHERE p.BOLSA_ID = :codigoBolsa
         AND p.DELETED_AT IS NULL
       ORDER BY p.ANO_LECTIVO DESC, p.SEMESTRE DESC`,
      { codigoBolsa } as any,
    );

    return { data: toLowerCaseKeys(rows), total: rows.length };
  }

  // ─────────────────────────────────────────────────────────────
  // TOGGLE ESTADO
  // ─────────────────────────────────────────────────────────────
  async toggleEstado(codigo: number) {
    const [pagamento] = await this.dataSource.query(
      `SELECT CODIGO, ESTADO FROM FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO WHERE CODIGO = :codigo AND DELETED_AT IS NULL`,
      { codigo } as any,
    );

    if (!pagamento) {
      throw new NotFoundException(`Pagamento ${codigo} não encontrado`);
    }

    const novoEstado = pagamento.ESTADO === 1 ? 0 : 1;

    await this.dataSource.query(
      `UPDATE FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO SET ESTADO = :novoEstado, UPDATED_AT = SYSDATE WHERE CODIGO = :codigo`,
      { novoEstado, codigo } as any,
    );

    return {
      statusCode: 200,
      message: `Pagamento ${novoEstado === 1 ? 'activado' : 'inactivado'} com sucesso`,
    };
  }
}

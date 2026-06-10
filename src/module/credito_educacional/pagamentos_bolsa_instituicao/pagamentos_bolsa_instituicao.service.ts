import { Injectable } from '@nestjs/common';
import { CreatePagamentosBolsaInstituicaoDto } from './dto/create-pagamentos_bolsa_instituicao.dto';
import { UpdatePagamentosBolsaInstituicaoDto } from './dto/update-pagamentos_bolsa_instituicao.dto';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { FindPagamentoBolsaDto } from './dto/find-pagamento-bolsa.dto';
import { FindEstudantesPorBolsaDto } from './dto/find-estudantes-por-bolsa.dto';



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
          DATA_DEPOSITO    = NVL(:dataDeposito,    DATA_DEPOSITO),
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

    // Se apenasSemPagamento=1 → mostra bolsas SEM pagamento registado
    // const joinType = apenasSemPagamento === 1 ? 'LEFT' : 'LEFT';
    const semPagamentoFilter =
      apenasSemPagamento === 1
        ? `AND p.CODIGO IS NULL`
        : ``;

    const baseQuery = `
      FROM FK2_TB_BOLSAS b
      LEFT JOIN FK2_TB_INSTITUICAO  i  ON i.CODIGO  = b.CODIGO_INSTITUICAO
      LEFT JOIN FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p  ON p.BOLSA_ID = b.CODIGO
      LEFT JOIN FK2_TB_ANO_LECTIVO al ON al.CODIGO = p.ANO_LECTIVO
                                      AND p.DELETED_AT IS NULL
                                      AND (:anoLectivo IS NULL OR p.ANO_LECTIVO = :anoLectivo)
                                      AND (:semestre   IS NULL OR p.SEMESTRE    = :semestre)
                                    
                                    
      LEFT JOIN (
          SELECT
            bs.CODIGO_BOLSA,
            COUNT(bs.CODIGO)  AS QTD_BOLSEIROS
          FROM FK2_TB_BOLSEIROS bs
          WHERE bs.STATUS_ = 1
            AND (:anoLectivo IS NULL OR bs.CODIGO_ANOLECTIVO = :anoLectivo)
            AND (:semestre   IS NULL OR bs.SEMESTRE          = :semestre)
          GROUP BY bs.CODIGO_BOLSA
      ) resumo ON resumo.CODIGO_BOLSA = b.CODIGO
      WHERE  b.STATUS = 1 
        AND (:codigoBolsa        IS NULL OR b.CODIGO               = :codigoBolsa)
        AND (:codigoInstituicao  IS NULL OR b.CODIGO_INSTITUICAO   = :codigoInstituicao)
        AND (:estado             IS NULL OR p.ESTADO               = :estado)
        AND (:nomeInstituicao    IS NULL OR UPPER(i.INSTITUICAO)   LIKE '%' || UPPER(:nomeInstituicao) || '%')
        ${semPagamentoFilter}
    `;

    const [dataResult, totalResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
            b.CODIGO                            AS CODIGO_BOLSA,
            b.DESIGNACAO                        AS BOLSA,
            i.CODIGO                            AS CODIGO_INSTITUICAO,
            i.INSTITUICAO,
            p.CODIGO                            AS CODIGO_PAGAMENTO,
            p.ANO_LECTIVO                    AS CODIGO_ANO_LETIVO,
            p.SEMESTRE,
            p.VALOR_DEPOSITADO,
            p.DATA_DEPOSITO,
            p.REFERENCIA,
            p.OBSERVACAO,
            p.ESTADO                            AS ESTADO_PAGAMENTO,
            p.CREATED_AT                        AS DATA_REGISTO,
            NVL(resumo.QTD_BOLSEIROS, 0)        AS QTD_ESTUDANTES,
            al.DESIGNACAO                       AS ANO_LETIVO
         ${baseQuery}
         ORDER BY i.INSTITUICAO ASC, b.DESIGNACAO ASC
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
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
  async resumoPorInstituicao(anoLectivo: number, semestre?: number) {
    if (!anoLectivo) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    const rows = await this.dataSource.query(
      `SELECT
          i.CODIGO                                  AS CODIGO_INSTITUICAO,
          i.INSTITUICAO,
          COUNT(DISTINCT b.CODIGO)                  AS QTD_BOLSAS,
          COUNT(DISTINCT bs.CODIGO)                 AS QTD_BOLSEIROS,

          -- Valor que a instituição já depositou
          NVL(SUM(p.VALOR_DEPOSITADO), 0)           AS VALOR_DEPOSITADO,

          -- Valor esperado = nº bolseiros × mensalidade total por semestre
          -- (simplificado: soma dos descontos fixos atribuídos)
          NVL(SUM(b.VALOR_DESCONTO), 0)             AS VALOR_ESPERADO,

          -- Diferença
          NVL(SUM(p.VALOR_DEPOSITADO), 0)
            - NVL(SUM(b.VALOR_DESCONTO), 0)         AS DIFERENCA,

          -- % de divergência
          CASE
            WHEN NVL(SUM(b.VALOR_DESCONTO), 0) = 0 THEN 0
            ELSE ROUND(
              (
                (NVL(SUM(p.VALOR_DEPOSITADO), 0) - NVL(SUM(b.VALOR_DESCONTO), 0))
                / NVL(SUM(b.VALOR_DESCONTO), 1)
              ) * 100, 2
            )
          END                                       AS PCT_DIVERGENCIA,

          -- Status de pagamento
          CASE
            WHEN SUM(p.VALOR_DEPOSITADO) IS NULL THEN 'Sem pagamento'
            WHEN ABS(
              NVL(SUM(p.VALOR_DEPOSITADO), 0) - NVL(SUM(b.VALOR_DESCONTO), 0)
            ) / NULLIF(NVL(SUM(b.VALOR_DESCONTO), 1), 0) * 100 >= 5
              THEN 'Divergência significativa'
            WHEN ABS(
              NVL(SUM(p.VALOR_DEPOSITADO), 0) - NVL(SUM(b.VALOR_DESCONTO), 0)
            ) / NULLIF(NVL(SUM(b.VALOR_DESCONTO), 1), 0) * 100 > 0
              THEN 'Divergência leve'
            ELSE 'Conciliado'
          END                                       AS STATUS_CONCILIACAO

       FROM FK2_TB_INSTITUICAO i
       INNER JOIN FK2_TB_BOLSAS b
          ON b.CODIGO_INSTITUICAO = i.CODIGO
       LEFT JOIN FK2_TB_BOLSEIROS bs
          ON bs.CODIGO_BOLSA      = b.CODIGO
         AND bs.STATUS_           = 1
         AND bs.CODIGO_ANOLECTIVO = :anoLectivo
         AND (:semestre IS NULL OR bs.SEMESTRE = :semestre)
       LEFT JOIN FK2_TB_PAGAMENTOS_BOLSA_INSTITUICAO p
          ON p.BOLSA_ID  = b.CODIGO
         AND p.ANO_LECTIVO   = :anoLectivo
         AND (:semestre IS NULL OR p.SEMESTRE = :semestre)
         AND p.DELETED_AT IS NULL
       WHERE i.DELETED_AT IS NULL
       GROUP BY i.CODIGO, i.INSTITUICAO
       ORDER BY i.INSTITUICAO ASC`,
      { anoLectivo, semestre: semestre ?? null } as any,
    );

    const data = toLowerCaseKeys(rows);

    // Métricas gerais (para o painel de Insights)
    const totalDepositado = data.reduce((s: number, r: any) => s + Number(r.valor_depositado), 0);
    const totalEsperado = data.reduce((s: number, r: any) => s + Number(r.valor_esperado), 0);
    const comDivergencia = data.filter((r: any) => r.status_conciliacao !== 'Conciliado' && r.status_conciliacao !== 'Sem pagamento').length;
    const semPagamento = data.filter((r: any) => r.status_conciliacao === 'Sem pagamento').length;
    const saudeConciliacao = totalEsperado > 0
      ? +((totalDepositado / totalEsperado) * 100).toFixed(2)
      : 0;

    const comMaiorValor = data.reduce(
      (max: any, r: any) => (Number(r.valor_depositado) > Number(max?.valor_depositado ?? 0) ? r : max),
      data[0] ?? null,
    );

    const comMaisBolseiros = data.reduce(
      (max: any, r: any) => (Number(r.qtd_bolseiros) > Number(max?.qtd_bolseiros ?? 0) ? r : max),
      data[0] ?? null,
    );

    return {
      data,
      insights: {
        totalDepositado,
        totalEsperado,
        diferenca: totalDepositado - totalEsperado,
        saudeConciliacao,
        comDivergenciaSignificativa: comDivergencia,
        semPagamento,
        instituicaoMaiorValor: comMaiorValor
          ? { nome: comMaiorValor.instituicao, valor: comMaiorValor.valor_depositado }
          : null,
        instituicaoMaisBolseiros: comMaisBolseiros
          ? { nome: comMaisBolseiros.instituicao, qtd: comMaisBolseiros.qtd_bolseiros }
          : null,
      },
    };
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
       WHERE i.DELETED_AT IS NULL
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
      statusBolseiro: statusBolseiro ?? null,
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

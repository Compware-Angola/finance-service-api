import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCreditoEducacionalDto } from './dto/create-credito_educacional.dto';
import { UpdateCreditoEducacionalDto } from './dto/update-credito_educacional.dto';
import { FindCreditoEducacionalDto } from './dto/find-credito-educacional.dto';
import { ValidarEstudanteCreditoDto } from './dto/validar-estudante-credito.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { PaymentService } from '../payment/payment.service';
import { AnoLectivoUtil } from '../util/current-academic-year';


@Injectable()
export class CreditoEducacionalService {

  private anoAtualPrincipal: number | null = null;
  private semestreAtual: number = 1;

  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
    private readonly paymentService: PaymentService,
  ) {
    this.initAnoAtual();
  }

  private async initAnoAtual() {
    try {
      this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
      const semestreResponse = await this.anoLectivoUtil.getSemestreAtual();
      this.semestreAtual = semestreResponse?.semestre ?? 1;

      console.log(`[CreditoEducacionalService] Ano Lectivo inicializado: ${this.anoAtualPrincipal} | Semestre: ${this.semestreAtual}`);
    } catch (error) {
      console.error('Erro ao inicializar ano lectivo/semestre:', error);
      // Fallback seguro

    }
  }

  async create(dto: CreateCreditoEducacionalDto, codigoUtilizador: number) {
    const dadosAluno = await this.obterDadosCompletosAluno(dto.codigoMatricula);
    // 1. Validação da Bolsa
    const [bolsa] = await this.dataSource.query(
      `SELECT b.CODIGO,b.VALOR_DESCONTO, tb.SIGLA FROM FK2_TB_BOLSAS b 
      INNER JOIN FK2_TB_TIPO_DESCONTO_BOLSAS tb ON b.CODIGO_TIPO_DESCONTO = tb.CODIGO
      WHERE b.CODIGO = :codigoBolsa`,
      { codigoBolsa: dto.codigoBolsa } as any,
    );

    if (!bolsa) {
      throw new NotFoundException(`Bolsa com código ${dto.codigoBolsa} não encontrada`);
    }


    // 2. Validação da Matrícula
    const [matricula] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_MATRICULAS WHERE CODIGO = :codigoMatricula`,
      { codigoMatricula: dto.codigoMatricula } as any,
    );

    if (!matricula) {
      throw new NotFoundException(`Matrícula com código ${dto.codigoMatricula} não encontrada`);
    }

    // 3. Verificar se já existe bolseiro activo para esta matrícula
    const [bolseiroExiste] = await this.dataSource.query(
      `
  SELECT CODIGO 
  FROM FK2_TB_BOLSEIROS 
  WHERE CODIGO_MATRICULA = :codigoMatricula
  AND STATUS_ = 1
  AND CODIGO_ANOLECTIVO = :codigoAnoLectivo
  AND (
    SEMESTRE = :semestre
    OR (
      :semestre = 3 AND SEMESTRE IN (1, 2)
    )
  )
  `,
      {
        codigoMatricula: dto.codigoMatricula,
        codigoAnoLectivo: dto.codigoAnoLectivo,
        semestre: dto.semestre
      } as any,
    );

    if (bolseiroExiste) {
      throw new BadRequestException(
        `Já existe um bolseiro activo para a matrícula ${dto.codigoMatricula}`,
      );
    }
    //   Ser fixo  deve ver pesquisar a mensalidade do aluno  e 
    //  saber quando ele paga por mes e calcular quanto sera os  
    //  10 meses  se  depois vou subtrair se sobrar  vou devolver 
    //  no saldo  do aluno 

    if (bolsa.SIGLA === "DESC_FIX") {
      const mensalidade = await this.obterMensalidade(
        dto.codigoAnoLectivo,
        dadosAluno,
      );

      const valorMensalidade = mensalidade.preco;

      // Se semestre 1 ou 2 => 5 mensalidades
      // Se semestre 3 => 10 mensalidades
      const totalMeses = [1, 2].includes(dto.semestre!) ? 5 : 10;

      const totalMensalidades = valorMensalidade * totalMeses;

      const saldoBolsa = bolsa.VALOR_DESCONTO - totalMensalidades;

      // Se sobrar dinheiro, vira crédito
      if (saldoBolsa > 0) {
        await this.paymentService.updateCreditAccount(
          dadosAluno.codigo_preinscricao,
          saldoBolsa,
        );
      }

      console.log({
        valorMensalidade,
        totalMeses,
        totalMensalidades,
        valorBolsa: bolsa.VALOR_DESCONTO,
        saldoBolsa,
      });
    }

    // 4. INSERT
    await this.dataSource.query(
      `
      INSERT INTO FK2_TB_BOLSEIROS (
          CODIGO_MATRICULA,
          CODIGO_TIPO_BOLSA,
          DESCONTO,
          ISENTAR_MULTA,
          CODIGO_UTILIZADOR,
          CANAL,
          CREATED_AT,
          UPDATED_AT,
          DATA_INICIO_BOLSA,
          DATA_FIM_BOLSA,
          CODIGO_INSTITUICAO,
          PAGARTAXASADICIONAIS,
          CODIGO_ANOLECTIVO,
          AFECTACAO,
          OBSERVACAO,
          STATUS_,
          SEMESTRE,
        
        
          CODIGO_TIPO_DESCONTO,
          CODIGO_TIPO_CREDITO,
          CODIGO_CREDITO,
          CODIGO_BOLSA
      )
      VALUES (
          :codigoMatricula,
          :codigoTipoBolsa,
          :desconto,
          :isentaMulta,
          :codigoUtilizador,
          :canal,
          TRUNC(SYSDATE),
          TRUNC(SYSDATE),
          :dataInicioBolsa,
          :dataFimBolsa,
          :codigoInstituicao,
          :pagarTaxasAdicionais,
          :codigoAnoLectivo,
          :afectacao,
          :observacao,
          :status,
          :semestre,
       
          :codigoTipoDesconto,
          :codigoTipoCredito,
          :codigoCredito,
          :codigoBolsa
      )
      `,
      {
        codigoMatricula: dto.codigoMatricula,
        codigoTipoBolsa: dto.codigoTipoBolsa ?? null,
        desconto: dto.desconto ?? null,
        isentaMulta: dto.isentaMulta ?? null,
        codigoUtilizador,
        canal: dto.canal ?? null,
        dataInicioBolsa: dto.dataInicioBolsa ?? null,
        dataFimBolsa: dto.dataFimBolsa ?? null,
        codigoInstituicao: dto.codigoInstituicao ?? null,
        pagarTaxasAdicionais: dto.pagarTaxasAdicionais ?? null,
        codigoAnoLectivo: dto.codigoAnoLectivo ?? null,
        afectacao: dto.afectacao ?? null,
        observacao: dto.observacao ?? null,
        status: 1,
        semestre: dto.semestre ?? null,


        codigoTipoDesconto: dto.codigoTipoDesconto ?? null,
        codigoTipoCredito: dto.codigoTipoCredito ?? null,
        codigoCredito: dto.codigoCredito ?? null,
        codigoBolsa: dto.codigoBolsa,
      } as any,
    );

    return {
      statusCode: 201,
      message: 'Bolseiro criado com sucesso',
    };
  }

  async update(codigo: number, dto: UpdateCreditoEducacionalDto, codigoUtilizador: number) {

    // 1. Validação da Bolsa
    const [bolsa] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_BOLSAS WHERE CODIGO = :codigoBolsa`,
      { codigoBolsa: dto.codigoBolsa } as any,
    );

    if (!bolsa) {
      throw new NotFoundException(`Bolsa com código ${dto.codigoBolsa} não encontrada`);
    }

    // 2. Validação da Matrícula
    const [matricula] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_MATRICULAS WHERE CODIGO = :codigoMatricula`,
      { codigoMatricula: dto.codigoMatricula } as any,
    );

    if (!matricula) {
      throw new NotFoundException(`Matrícula com código ${dto.codigoMatricula} não encontrada`);
    }


    await this.dataSource.query(
      `
  UPDATE FK2_TB_BOLSEIROS 
  SET
      CODIGO_MATRICULA      = :codigoMatricula,
      CODIGO_TIPO_BOLSA     = :codigoTipoBolsa,
      DESCONTO              = :desconto,
      ISENTAR_MULTA         = :isentaMulta,
      CODIGO_UTILIZADOR     = :codigoUtilizador,
      CANAL                 = :canal,
      UPDATED_AT            = TRUNC(SYSDATE),
      DATA_INICIO_BOLSA     = :dataInicioBolsa,
      DATA_FIM_BOLSA        = :dataFimBolsa,
      CODIGO_INSTITUICAO    = :codigoInstituicao,
      PAGARTAXASADICIONAIS  = :pagarTaxasAdicionais,
      CODIGO_ANOLECTIVO     = :codigoAnoLectivo,
      AFECTACAO             = :afectacao,
      OBSERVACAO            = :observacao,
      SEMESTRE              = :semestre,
      CODIGO_TIPO_DESCONTO  = :codigoTipoDesconto,
      CODIGO_TIPO_CREDITO   = :codigoTipoCredito,
      CODIGO_CREDITO        = :codigoCredito,
      CODIGO_BOLSA          = :codigoBolsa
  WHERE CODIGO = :codigo
  `,
      {
        codigoMatricula: dto.codigoMatricula,
        codigoTipoBolsa: dto.codigoTipoBolsa ?? null,
        desconto: dto.desconto ?? null,
        isentaMulta: dto.isentaMulta ?? null,
        codigoUtilizador,
        canal: dto.canal ?? null,
        dataInicioBolsa: dto.dataInicioBolsa ?? null,
        dataFimBolsa: dto.dataFimBolsa ?? null,
        codigoInstituicao: dto.codigoInstituicao ?? null,
        pagarTaxasAdicionais: dto.pagarTaxasAdicionais ?? null,
        codigoAnoLectivo: dto.codigoAnoLectivo ?? null,
        afectacao: dto.afectacao ?? null,
        observacao: dto.observacao ?? null,
        semestre: dto.semestre ?? null,


        codigoTipoDesconto: dto.codigoTipoDesconto ?? null,
        codigoTipoCredito: dto.codigoTipoCredito ?? null,
        codigoCredito: dto.codigoCredito ?? null,
        codigoBolsa: dto.codigoBolsa,
        codigo,
      } as any,
    );

    return {
      statusCode: 200,
      message: 'Bolseiro actualizado com sucesso',
    };
  }
  async findAll(query: FindCreditoEducacionalDto) {
    const {
      codigoInstituicao,
      codigoAnoLectivo,
      status,
      codigoBolsa,
      codigoTipoCredito,
      codigoMatricula,
      nome,
      cursoId,
      cursoDesignacao,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    const params = {
      codigoInstituicao: codigoInstituicao ?? null,
      codigoAnoLectivo: codigoAnoLectivo ?? null,
      status: status ?? null,
      codigoBolsa: codigoBolsa ?? null,
      codigoTipoCredito: codigoTipoCredito ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
      cursoId: cursoId ?? null,
      cursoDesignacao: cursoDesignacao ?? null,
    };

    const whereClause = `
    WHERE 1=1
    AND e.codigo_instituicao      = b.CODIGO (+)
    AND a.CODIGO_ANOLECTIVO       = c.CODIGO (+)
    AND a.CODIGO_BOLSA            = e.CODIGO (+)
    AND e.CODIGO_TIPO_CREDITO     = f.CODIGO (+)
    AND e.CODIGO_TIPO_DESCONTO    = g.CODIGO (+)
    AND a.CODIGO_MATRICULA        = h.CODIGO (+)
    AND h.CODIGO_ALUNO            = i.CODIGO (+)
    AND i.PRE_INCRICAO            = j.CODIGO (+)
    AND h.CODIGO_CURSO            = k.CODIGO (+)
    AND a.codigo_bolsa            = e.codigo (+)
    AND (:codigoInstituicao  IS NULL OR a.codigo_instituicao      = :codigoInstituicao)
    AND (:codigoAnoLectivo   IS NULL OR a.CODIGO_ANOLECTIVO       = :codigoAnoLectivo)
    AND (:status             IS NULL OR a.STATUS_                 = :status)
    AND (:codigoBolsa        IS NULL OR e.CODIGO                  = :codigoBolsa)
    AND (:codigoTipoCredito  IS NULL OR e.CODIGO_TIPO_CREDITO     = :codigoTipoCredito)
    AND (:codigoMatricula    IS NULL OR a.CODIGO_MATRICULA        = :codigoMatricula)
    AND (:nome               IS NULL OR UPPER(j.NOME_COMPLETO)    LIKE '%' || UPPER(:nome)  || '%')
    AND (:cursoId            IS NULL OR k.CODIGO                  = :cursoId)
    AND (:cursoDesignacao    IS NULL OR UPPER(k.DESIGNACAO)       LIKE '%' || UPPER(:cursoDesignacao) || '%')
  `;

    const fromClause = `
    FROM FK2_TB_BOLSEIROS            a
       , FK2_TB_INSTITUICAO          b
       , FK2_TB_ANO_LECTIVO          c
       , FK2_TB_BOLSAS               e
       , FK2_TB_TIPO_CREDITO         f
       , FK2_TB_TIPO_DESCONTO_BOLSAS g
       , FK2_TB_MATRICULAS           h
       , FK2_TB_ADMISSAO             i
       , FK2_TB_PREINSCRICAO         j
       , FK2_TB_CURSOS               k
  `;

    const [dataResutl, total] = await Promise.all([
      this.dataSource.query(
        `
      SELECT
          a.CODIGO,
          a.CODIGO_MATRICULA,
          j.NOME_COMPLETO,
          j.BILHETE_IDENTIDADE,
          k.DESIGNACAO                              AS CURSO,
          c.DESIGNACAO                              AS TIPO_BOLSA,
          a.CODIGO_UTILIZADOR,
          a.CANAL,
          a.CREATED_AT,
          a.UPDATED_AT,
          a.DATA_INICIO_BOLSA,
          a.DATA_FIM_BOLSA,
          b.CODIGO                                  AS CODIGO_INSTITUICAO,
          b.INSTITUICAO,
          a.CODIGO_ANOLECTIVO,
          c.DESIGNACAO                              AS ANO_LECTIVO,
          a.OBSERVACAO,
          a.HISTORICO,
          a.STATUS_,
          a.SEMESTRE,
          a.ESTADOBOLSA,
         
          a.TIPO_ALUNO_ID,
          NVL(e.VALOR_DESCONTO, a.DESCONTO)         AS VALOR_DESCONTO,
          NVL(e.CODIGO_TIPO_DESCONTO, 1)            AS CODIGO_TIPO_DESCONTO,
          NVL(g.DESIGNACAO, 'PERCENTUAL')           AS TIPO_DESCONTO,
          e.CODIGO_TIPO_CREDITO,
          f.DESIGNACAO                              AS TIPO_CREDITO,
          a.CODIGO_BOLSA,
          e.DESIGNACAO                              AS BOLSA
      ${fromClause}
      ${whereClause}
      ORDER BY a.CODIGO DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
        { ...params, offset, limit } as any,
      ),

      this.dataSource.query(
        `
      SELECT COUNT(*) AS TOTAL
      ${fromClause}
      ${whereClause}
      `,
        params as any,
      ),
    ]);

    const totalRecords = Number(total[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(dataResutl),
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }
  async validarEstudanteParaCredito(query: ValidarEstudanteCreditoDto) {
    const { codigoMatricula, codigoAnoLectivo, semestre } = query;

    const sql = `
      SELECT
        m.CODIGO                AS CODIGO_MATRICULA,
        p.NOME_COMPLETO         AS NOME_COMPLETO,
        p.BILHETE_IDENTIDADE    AS BI,
        c.DESIGNACAO            AS CURSO,
        pe.DESIGNACAO           AS PERIODO,
        m.ESTADO_MATRICULA      AS ESTADO_MATRICULA,
        b.CODIGO                AS CODIGO_BOLSEIRO,
        b.CODIGO_BOLSA          AS CODIGO_BOLSA,
        bo.DESIGNACAO           AS BOLSA,
        b.STATUS_               AS STATUS_BOLSEIRO,
        b.CODIGO_ANOLECTIVO     AS CODIGO_ANO_LECTIVO,
        b.SEMESTRE              AS SEMESTRE
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_ADMISSAO a
        ON a.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.CODIGO = a.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS c
        ON c.CODIGO = m.CODIGO_CURSO
      INNER JOIN FK2_TB_PERIODOS pe
        ON pe.CODIGO = p.CODIGO_TURNO
      LEFT JOIN FK2_TB_BOLSEIROS b
        ON b.CODIGO_MATRICULA = m.CODIGO
       AND b.STATUS_ = 1
       AND b.CODIGO_ANOLECTIVO = :codigoAnoLectivo
       AND b.SEMESTRE = :semestre
      LEFT JOIN FK2_TB_BOLSAS bo
        ON bo.CODIGO = b.CODIGO_BOLSA
      WHERE m.CODIGO = :codigoMatricula
      ORDER BY b.CODIGO DESC
      FETCH FIRST 1 ROW ONLY
    `;

    const [row] = await this.dataSource.query(sql, {
      codigoMatricula,
      codigoAnoLectivo,
      semestre,
    } as any);

    if (!row) {
      throw new NotFoundException('Aluno não encontrado');
    }

    if (row.ESTADO_MATRICULA?.toLowerCase() === 'diplomado') {
      throw new BadRequestException('Aluno diplomado');
    }

    return {
      ...toLowerCaseKeys(row),
      ja_bolsista: Boolean(row.CODIGO_BOLSEIRO),
    };
  }
  async switchBolseiro(codigo: number) {
    const [bolseiro] = await this.dataSource.query(
      `
      SELECT STATUS_
      FROM FK2_TB_BOLSEIROS 
      WHERE CODIGO = :codigo
      `,
      { codigo } as any,
    );
    if (bolseiro?.STATUS_ === 1) {
      return this.inativarBolseiro(codigo);
    } else {
      return this.ativarBolseiro(codigo);
    }
  }
  private async inativarBolseiro(codigo: number) {
    await this.dataSource.query(
      `
      UPDATE FK2_TB_BOLSEIROS 
      SET
          STATUS_ = 0,
          UPDATED_AT = TRUNC(SYSDATE)
      WHERE CODIGO = :codigo
      `,
      { codigo } as any,
    );
    return {
      statusCode: 200,
      message: 'Bolseiro inativado com sucesso',
    };
  }
  private async ativarBolseiro(codigo: number) {
    await this.dataSource.query(
      `
      UPDATE FK2_TB_BOLSEIROS 
      SET
          STATUS_ = 1,
          UPDATED_AT = TRUNC(SYSDATE)
      WHERE CODIGO = :codigo
      `,
      { codigo } as any,
    );
    return {
      statusCode: 200,
      message: 'Bolseiro ativado com sucesso',
    };
  }

  private async obterMensalidade(
    anoLectivo: number,
    dadosAluno: any,
  ): Promise<{ codigo_servico: number; preco: number; descricao: string }> {
    console.log(dadosAluno);

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
  private async obterDadosCompletosAluno(codigoMatricula: number) {
    const sql = `
      SELECT
        c.designacao           as curso,
        c.codigo               as codigo_curso,
        c.sigla                as sigla,
        c.duracao              as duracao_curso,
        p.codigo_turno         as turno,
        p.codigo               as codigo_preinscricao,    
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
  async getInfoBolseiroDados(codigoMatricula: number) {

    const ano = await this.anoLectivoUtil.getAnoAtualId();
    const semestre = (await this.anoLectivoUtil.getSemestreAtual()).semestre ?? 1;
    let data_inicio_bolsa: any = null, data_fim_bolsa: any = null

    const result = await this.getBolseiroDados(codigoMatricula, ano, semestre);


    if (result) {
      switch (semestre) {
        case 3:
          data_inicio_bolsa = (await this.anoLectivoUtil.getSemestresConfigurados()).primeiroSemestre?.dataInicio
          data_fim_bolsa = (await this.anoLectivoUtil.getSemestresConfigurados()).segundoSemestre?.dataFim
          break;
        default:
          data_inicio_bolsa = (await this.anoLectivoUtil.getSemestreAtual()).dataInicio
          data_fim_bolsa = (await this.anoLectivoUtil.getSemestreAtual()).dataFim
          break;

      }


    }
    return {
      ...result,
      isBolseiro: Boolean(result),
      data_inicio_bolsa,
      data_fim_bolsa
    };
  }

  private async getBolseiroDados(
    codigoMatricula: number,
    codigoAnoLectivo: number,
    semestre: number,
  ) {
    if (!codigoMatricula || !codigoAnoLectivo || !semestre) {
      throw new BadRequestException(
        'Todos os parâmetros são obrigatórios',
      );
    }

    const sql = `
    SELECT
      a.CODIGO,
      a.CODIGO_MATRICULA,

      j.NOME_COMPLETO,
      j.BILHETE_IDENTIDADE,

      k.DESIGNACAO                          AS CURSO,

      a.CODIGO_UTILIZADOR,
      a.CANAL,
      a.CREATED_AT,
      a.UPDATED_AT,

    

      b.CODIGO                              AS CODIGO_INSTITUICAO,
      b.INSTITUICAO,

      a.CODIGO_ANOLECTIVO,
      c.DESIGNACAO                          AS ANO_LECTIVO,

      a.OBSERVACAO,
      a.HISTORICO,
      a.STATUS_,
      a.SEMESTRE,
      a.ESTADOBOLSA,
      a.TIPO_ALUNO_ID,

      NVL(e.VALOR_DESCONTO, a.DESCONTO)     AS VALOR_DESCONTO,

      NVL(e.CODIGO_TIPO_DESCONTO, 1)        AS CODIGO_TIPO_DESCONTO,

      NVL(db.DESIGNACAO, 'PERCENTUAL')       AS TIPO_DESCONTO,

      NVL(db.SIGLA, 'DESC_PERC')           AS SIGLA,

      e.CODIGO_TIPO_CREDITO,
      f.DESIGNACAO                          AS TIPO_CREDITO,

      a.CODIGO_BOLSA,
      e.DESIGNACAO                          AS BOLSA,

      a.ISENTAR_MULTA

    FROM FK2_TB_BOLSEIROS a

    LEFT JOIN FK2_TB_INSTITUICAO b
      ON b.CODIGO = a.CODIGO_INSTITUICAO

    LEFT JOIN FK2_TB_ANO_LECTIVO c
      ON c.CODIGO = a.CODIGO_ANOLECTIVO

    LEFT JOIN FK2_TB_BOLSAS e
      ON e.CODIGO = a.CODIGO_BOLSA

    LEFT JOIN FK2_TB_TIPO_CREDITO f
      ON f.CODIGO = e.CODIGO_TIPO_CREDITO


    LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS db
      ON db.CODIGO = e.CODIGO_TIPO_DESCONTO

    LEFT JOIN FK2_TB_MATRICULAS h
      ON h.CODIGO = a.CODIGO_MATRICULA

    LEFT JOIN FK2_TB_ADMISSAO i
      ON i.CODIGO = h.CODIGO_ALUNO

    LEFT JOIN FK2_TB_PREINSCRICAO j
      ON j.CODIGO = i.PRE_INCRICAO

    LEFT JOIN FK2_TB_CURSOS k
      ON k.CODIGO = h.CODIGO_CURSO

    WHERE a.CODIGO_MATRICULA = :codigoMatricula
      AND a.CODIGO_ANOLECTIVO = :codigoAnoLectivo
      AND a.SEMESTRE = :semestre
  `;

    const [row] = await this.dataSource.query(
      sql,
      {
        codigoMatricula,
        codigoAnoLectivo,
        semestre,
      } as any,
    );

    return toLowerCaseKeys(row);
  }
}

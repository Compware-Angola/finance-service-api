import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { StudentPaymentsQueryDto } from './dto/student-payment.dto';
import { DecodedUserPayload } from 'src/common/types/token-validation-response.interface';
import { Payment2 } from './entities/payment2.entity';
import { ListPaymentDTO } from './dto/list-payment.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindPaymentMonthlyDTO } from './dto/find-payment-monthly.dto';
import { AtribuirProvaHelper } from 'src/common/helpers/atribuir-prova.helper';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { TipoPagamento } from './dto/listar-servico-pagos.dto';
import { CashRegistersService } from '../cash-registers/cash-registers.service';
import { YesNo } from '../cash-registers/enums/cash-register-status.enum';
import { ExportPaymentMonthlyDTO } from './dto/export-payment-monthly.dto';
import { CsvExportHelper } from 'src/common/helpers/export/csv-export.helper';
import { PdfExportHelper } from 'src/common/helpers/export/pdf-export.helper';
import { StudentMovimentUtilService } from '../shared/student_moviments/student_moviments_util.service';
import { StudentMovimentOperationType } from 'src/enum/student-moviment-operation-type.enum';
import { fixToInt } from '../util/round';

// ── Tipos internos ────────────────────────────────────────────────────────────

export enum PaymentStatus {
  CONCLUIDO = 'concluido',
  PENDENTE = 'pendente',
}

type InvoiceContext = {
  anoLectivo: number;
  CodigoMatricula: number | null;
  codigoPreinscricao: number | null;
};

type FindAlunoBy = 'matricula' | 'preinscricao';

type PaymentMonthlyExportRow = {
  CODIGOPAGAMENTO: number;
  CODIGOMATRICULA: number;
  TIPO: string | null;
  NOMECOMPLETO: string;
  FACULDADE: string;
  CURSO: string;
  PERIODO: string;
  MES: string;
  VALORMENSALIDADE: number;
  ANOLECTIVO: string;
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentService {
  private anoAtualPrincipal: number;

  constructor(
    private readonly anoLectivoUtil: AnoLectivoUtil,
    @InjectRepository(Payment2)
    private readonly paymentRepository: Repository<Payment2>,
    private readonly invoiceService: InvoiceService,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly cashRegistersService: CashRegistersService,
    private readonly studentMovimentUtilService: StudentMovimentUtilService,
  ) {
    this.initAnoAtual();
  }

  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }

  // ── Consultas ───────────────────────────────────────────────────────────────

  /**
   * Busca Pagamentos, Faturas e seus Itens em formato "flat" (plano) com paginação,
   * incluindo a descrição do serviço, filtrando pelo Ano Lectivo e Código de Pré-Inscrição.
   */
  async findInvoicesAndItemsDetailedFlat(
    anoLectivo: string,
    codigoPreInscricao: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PagedResult<any>> {
    const { limit = 10, page = 1 } = paginationQuery;
    const skip = (page - 1) * limit;

    const baseQuery = this.paymentRepository
      .createQueryBuilder('p')
      .innerJoin('UMA_FACTURA', 'f', '"p"."codigo_factura" = "f"."Codigo"')
      .innerJoin(
        'UMA_FACTURA_ITEMS',
        'fi',
        '"f"."Codigo" = "fi"."CodigoFactura"',
      )
      .innerJoin(
        'UMA_TB_TIPO_SERVICOS',
        'tp',
        '"fi"."CodigoProduto" = "tp"."Codigo"',
      )
      .where('REGEXP_LIKE(TRIM("p"."AnoLectivo"), \'^[0-9]+$\')')
      .andWhere('REGEXP_LIKE(TRIM("p"."Codigo_PreInscricao"), \'^[0-9]+$\')')
      .andWhere('TRIM("p"."AnoLectivo") = :anoLectivo', { anoLectivo })
      .andWhere('TRIM("p"."Codigo_PreInscricao") = :codigoPreInscricao', {
        codigoPreInscricao,
      })
      .andWhere('"f"."estado" = :status', { status: 1 });

    const totalResult = await baseQuery
      .select('COUNT(DISTINCT("p"."Codigo"))', 'cnt')
      .getRawOne();

    const total = Number(totalResult?.cnt || 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    const results = await baseQuery
      .select([
        '"p"."Codigo" AS "CodigoPagamento"',
        '"p"."Data" AS "DataPagamento"',
        '"p"."N_Operacao_Bancaria" AS "p_N_Operacao_Bancaria"',
        '"p"."valor_depositado" AS "p_valor_depositado"',
        '"p"."status_pagamento" AS "p_status_pagamento"',
        '"p"."created_at" AS "DataRegistoPagamento"',
        '"p"."statusMovimento" AS "p_statusMovimento"',
        '"p"."ContaMovimentada" AS "p_ContaMovimentada"',
        '"p"."forma_pagamento" AS "p_forma_pagamento"',
        '"f"."Codigo" AS "CodigoFactura"',
        '"f"."Descricao" AS "Descricao_factura"',
        '"f"."DataFactura" AS "f_DataFactura"',
        '"f"."Referencia" AS "f_Referencia"',
        '"f"."estado" AS "EstadoFactura"',
        '"f"."ValorAPagar" AS "f_ValorAPagar"',
        '"f"."TotalPreco" AS "TotalBrutoFactura"',
        '"f"."TotalMulta" AS "TotalMultaFactura"',
        '"fi"."codigo" AS "CodigoItem"',
        '"fi"."CodigoProduto" AS "CodigoProduto"',
        '"fi"."OBS" AS "ObservacaoItem"',
        '"fi"."Quantidade" AS "Quantidade"',
        '"fi"."preco" AS "PrecoUnitario"',
        '"fi"."Total" AS "TotalItem"',
        '"fi"."Mes" AS "MesReferencia"',
        '"fi"."Multa" AS "MultaItem"',
        '"fi"."valor_pago" AS "valor_pago"',
        '"fi"."taxa_iva" AS "taxa_iva"',
        '"tp"."Descricao" AS "Descricao_produto"',
      ])
      .orderBy('"p"."DataRegisto"', 'DESC')
      .addOrderBy('"f"."DataFactura"', 'DESC')
      .addOrderBy('"fi"."codigo"', 'ASC')
      .getRawMany();

    return { data: results, total, page, limit, totalPages };
  }

  async listarServicosPagosAluno(filter: {
    anoLectivo?: number;
    codigoMatricula?: number;
    tipo?: TipoPagamento;
  }) {
    const { anoLectivo, codigoMatricula, tipo = 'TODOS' } = filter;

    const preinscricaoResult = await this.dataSource.query(
      `
      SELECT ta.PRE_INCRICAO AS CODIGO_PREINSCRICAO
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.CODIGO = tm.CODIGO_ALUNO
      WHERE tm.CODIGO = :1
    `,
      [codigoMatricula],
    );

    const codigoPreinscricao = preinscricaoResult?.[0]?.CODIGO_PREINSCRICAO;
    if (!codigoPreinscricao) return [];

    const mensalidadeClause = `
      (
        TRIM(UPPER(NVL(s.SIGLA, ''))) = 'PROP'
        OR TRIM(UPPER(NVL(s.TIPOSERVICO, ''))) = 'MENSAL'
      )
    `;

    let tipoClause = '';
    if (tipo === 'MENSALIDADES') tipoClause = `AND ${mensalidadeClause}`;
    if (tipo === 'SERVICOS') tipoClause = `AND NOT ${mensalidadeClause}`;

    const sql = `
      SELECT
        pi.CODIGO,
        DBMS_LOB.SUBSTR(s.DESCRICAO, 4000, 1) AS SERVICO,
        pi.VALOR_TOTAL,
        p.DATABANCO,
        p.UPDATED_AT,
        p.ANOLECTIVO,
        s.CODIGO AS CODIGO_SERVICO
      FROM FK2_TB_PAGAMENTOSI pi
      INNER JOIN FK2_TB_PAGAMENTOS p   ON p.CODIGO = pi.CODIGO_PAGAMENTO
      INNER JOIN FK2_TB_TIPO_SERVICOS s ON s.CODIGO = pi.CODIGO_SERVICO
      WHERE p.ANOLECTIVO = :1
        AND p.ESTADO = 1
        AND p.CODIGO_PREINSCRICAO = :2
        AND DBMS_LOB.GETLENGTH(s.DESCRICAO) > 0
        ${tipoClause}
      ORDER BY p.DATA, p.CODIGO_FACTURA ASC
    `;

    const result = await this.dataSource.query(sql, [
      anoLectivo,
      codigoPreinscricao,
    ]);

    return result.map((row: any) => ({
      codigo: row.CODIGO,
      servico: row.SERVICO,
      valor: row.VALOR_TOTAL,
      data_pagamento_banco: row.DATABANCO,
      data_validacao: row.UPDATED_AT,
      ano_lectivo: row.ANOLECTIVO,
      codigo_servico: row.CODIGO_SERVICO,
    }));
  }

  async studentPayments(query: StudentPaymentsQueryDto) {
    const {
      codigoMatricula,
      codigoPreInscricao,
      anoLectivo,
      codigoFactura,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let whereClause = `f."ESTADO" = 1`;

    const idFilters: string[] = [];
    if (codigoMatricula) {
      queryParams.push(codigoMatricula);
      idFilters.push(`f."CODIGOMATRICULA" = :${queryParams.length}`);
    }
    if (codigoPreInscricao) {
      queryParams.push(codigoPreInscricao);
      idFilters.push(`f."CODIGO_PREINSCRICAO" = :${queryParams.length}`);
    }
    if (idFilters.length > 0) {
      whereClause += ` AND (${idFilters.join(' OR ')})`;
    }
    if (codigoFactura) {
      queryParams.push(codigoFactura);
      whereClause += ` AND f."CODIGO" = :${queryParams.length}`;
    }
    if (anoLectivo) {
      queryParams.push(anoLectivo);
      whereClause += ` AND f."ANO_LECTIVO" = :${queryParams.length}`;
    }

    const baseQuery = `
      FROM FK2_FACTURA f
      WHERE ${whereClause}
      GROUP BY
        f."CODIGO", f."DATAFACTURA",
        f."VALORAPAGAR", f."TOTALPRECO", f."TOTALMULTA", f."ESTADO"
    `;

    const sqlData = `
      SELECT
        f."CODIGO" AS "CodigoFactura",
        f."DATAFACTURA",
        f."VALORAPAGAR",
        f."TOTALPRECO",
        f."TOTALMULTA",
        f."ESTADO" AS "EstadoFactura"
      ${baseQuery}
      ORDER BY f."DATAFACTURA" DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const sqlCount = `
      SELECT COUNT(*) AS TOTAL FROM (
        SELECT f."CODIGO" ${baseQuery}
      ) t
    `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sqlData, queryParams),
      this.dataSource.query(sqlCount, queryParams),
    ]);

    const total = Number(countResult[0]?.TOTAL || 0);

    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async studentPaymentsDetails(facturaCode: number) {
    const sql = `
      SELECT
        f.CODIGO AS CodigoFactura,
        f.DATAFACTURA AS DataFactura,
        f.REFERENCIA,
        f.CODIGOMATRICULA,
        f.CODIGO_PREINSCRICAO,
        f.VALORAPAGAR,
        f.TOTALPRECO,
        f.TOTALMULTA,
        f.TOTALIVA,
        DBMS_LOB.SUBSTR(f.OBS, 4000, 1) AS ObservacaoFactura,
        DBMS_LOB.SUBSTR(tp.DESCRICAO, 4000, 1) AS Servico,
        ffi.QUANTIDADE,
        ffi.PRECO,
        ffi.VALOR_IVA,
        ffi.MULTA,
        ffi.TOTAL,
        ffi.VALOR_PAGO
      FROM FK2_FACTURA f
      INNER JOIN FK2_FACTURA_ITEMS ffi ON f.CODIGO = ffi.CODIGOFACTURA
      INNER JOIN FK2_TB_TIPO_SERVICOS tp ON ffi.CODIGOPRODUTO = tp.CODIGO
      WHERE f.CODIGO = :facturaCode
      ORDER BY DBMS_LOB.SUBSTR(tp.DESCRICAO, 4000, 1)
    `;
    return this.dataSource.query(sql, [facturaCode]);
  }

  async findPayments(filters: ListPaymentDTO) {
    const {
      anoLectivo,
      codigoFactura,
      codigoMatricula,
      estado,
      nome,
      dataInicio,
      dataFim,
      n_operacao_bancaria2,
      n_operacao_bancaria,
      page = 1,
      limit = 25,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['1 = 1'];
    const params: any = {};
    const dateFormat = 'YYYY-MM-DD';

    if (anoLectivo) {
      conditions.push(`fac.ANO_LECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }
    if (codigoFactura) {
      conditions.push(`fac.CODIGO = :codigoFactura`);
      params.codigoFactura = codigoFactura;
    }
    if (codigoMatricula) {
      conditions.push(`mac.CODIGO = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }
    if (estado) {
      conditions.push(`pg.status_pagamento = :statusPagamento`);
      params.statusPagamento = estado == 2 ? 'pendente' : 'concluido';
    }
    if (n_operacao_bancaria) {
      conditions.push(`pg.n_operacao_bancaria = :nOperacaoBancaria`);
      params.nOperacaoBancaria = n_operacao_bancaria;
    }
    if (n_operacao_bancaria2) {
      conditions.push(`pg.n_operacao_bancaria2 = :nOperacaoBancaria2`);
      params.nOperacaoBancaria2 = n_operacao_bancaria2;
    }
    if (dataInicio) {
      conditions.push(
        `pg.dataregisto >= TO_DATE(:dataInicio, '${dateFormat}')`,
      );
      params.dataInicio = dataInicio;
    }
    if (dataFim) {
      conditions.push(
        `pg.dataregisto <= TO_DATE(:dataFim, '${dateFormat}') + INTERVAL '1' DAY - INTERVAL '1' SECOND`,
      );
      params.dataFim = dataFim;
    }
    if (nome) {
      conditions.push(`
        fn_remove_acentos(UPPER(pre.NOME_COMPLETO))
        LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'
      `);
      params.nome = nome;
    }

    const whereClause = conditions.join(' AND ');

    const joins = `
      FROM FK2_TB_PAGAMENTOS pg
      INNER JOIN FK2_FACTURA fac              ON fac.codigo = pg.codigo_factura
      LEFT JOIN FK2_TB_MATRICULAS mac        ON mac.codigo = fac.CODIGOMATRICULA
      LEFT JOIN FK2_TB_ADMISSAO adm          ON adm.codigo = mac.CODIGO_ALUNO
     LEFT JOIN FK2_TB_PREINSCRICAO pre
  ON pre.codigo = NVL(adm.PRE_INCRICAO, fac.CODIGO_PREINSCRICAO)
      LEFT JOIN FK2_TB_CURSOS cur            ON cur.codigo = NVL(mac.codigo_curso, pre.curso_candidatura)
      LEFT  JOIN FK2_TB_CAIXAS cai            ON cai.codigo = pg.caixa_id
      LEFT  JOIN fk2_tb_canal_comunicacao can ON can.codigo = pg.canal
      LEFT  JOIN FK2_TB_FORMA_PAGAMENTO fp    ON to_char(fp.codigo) = pg.forma_pagamento
      LEFT  JOIN FK2_MCA_TB_UTILIZADOR ut     ON ut.PK_UTILIZADOR = pg.FK_UTILIZADOR
    `;

    const sql = `
      SELECT
  pg.codigo                                                    AS codigo_pagamento,
  to_char(pg.dataregisto, 'YYYY-MM-DD"T"HH24:MI:SS')          AS data_registro,
  pg.N_OPERACAO_BANCARIA                                       AS operacao_bancaria,
  pg.N_OPERACAO_BANCARIA2                                      AS seg_operacao_bancaria,
  pg.anolectivo,
  pg.totalgeral,
  pg.databanco,
  COALESCE(fp.descricao, pg.forma_pagamento)                   AS forma_pagamento,
  pg.valor_depositado,
  pg.contamovimentada                                          AS conta_movimentada,
  pg.estado                                                    AS estado_pagamento,
  pg.tipo_pagamento,
  pg.status_pagamento,
  pg.updated_at                                                AS data_actualizacao,
  pg.data_operacao,
  cai.nome                                                     AS caixa,
  pre.nome_completo,
  mac.codigo                                                   AS codigo_matricula,
  cur.designacao                                               AS curso,
  fac.codigo                                                   AS codigo_factura,
  ut.Nome                                                      AS nome_operador,
  can.designacao                                               AS canal,
  (
    SELECT LISTAGG(ts.Descricao, ' • ')
           WITHIN GROUP (ORDER BY ts.Descricao)
    FROM FK2_FACTURA_ITEMS fi
    LEFT JOIN FK2_TB_TIPO_SERVICOS ts
           ON ts.Codigo = fi.CodigoProduto
    WHERE fi.CodigoFactura = fac.codigo
  ) AS servicos
${joins}
WHERE ${whereClause}
ORDER BY pg.codigo DESC
OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const sqlCount = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_PAGAMENTOS pg
      INNER JOIN FK2_FACTURA fac         ON fac.codigo = pg.codigo_factura
      INNER JOIN FK2_TB_MATRICULAS mac   ON mac.codigo = fac.CODIGOMATRICULA
      INNER JOIN FK2_TB_ADMISSAO adm     ON adm.codigo = mac.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pre ON pre.codigo = adm.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS cur       ON cur.codigo = mac.codigo_curso
      INNER JOIN FK2_TB_CAIXAS cai       ON cai.codigo = pg.caixa_id
      WHERE ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);

    return {
      data: toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPaymentMonthly(filters: FindPaymentMonthlyDTO) {
    const {
      codigoAnoLectivo,
      codigoCurso,
      codigoPagamento,
      codigoFaculdade,
      codigoMatricula,
      codigoPeriodo,
      nome,
      mesId,
      limit = 10,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = ['fac.ESTADO = 1'];
    const params: any = {};

    if (codigoPagamento) {
      conditions.push(`pag.CODIGO = :codigoPagamento`);
      params.codigoPagamento = codigoPagamento;
    }
    if (codigoCurso) {
      conditions.push(`cur.CODIGO = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }
    if (codigoAnoLectivo) {
      conditions.push(`al.CODIGO  = :codigoAnoLectivo`);
      params.codigoAnoLectivo = codigoAnoLectivo;
    }
    if (codigoFaculdade) {
      conditions.push(`fab.CODIGO = :codigoFaculdade`);
      params.codigoFaculdade = codigoFaculdade;
    }
    if (codigoMatricula) {
      conditions.push(`tm.CODIGO  = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }
    if (codigoPeriodo) {
      conditions.push(`per.CODIGO = :codigoPeriodo`);
      params.codigoPeriodo = codigoPeriodo;
    }
    if (mesId) {
      conditions.push(`mes.ID     = :mesId`);
      params.mesId = mesId;
    }
    if (nome) {
      conditions.push(`
        fn_remove_acentos(UPPER(pre.NOME_COMPLETO))
        LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'
      `);
      params.nome = nome;
    }

    const whereClause = conditions.join(' AND ');

    const baseJoins = `
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ad       ON ad.CODIGO  = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pre  ON pre.CODIGO = ad.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS cur        ON cur.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE fab     ON fab.CODIGO = cur.FACULDADE_ID
      INNER JOIN FK2_FACTURA fac          ON fac.CODIGOMATRICULA = tm.CODIGO
      INNER JOIN FK2_FACTURA_ITEMS fai    ON fai.CODIGOFACTURA   = fac.CODIGO
      INNER JOIN FK2_TB_PAGAMENTOS pag    ON pag.CODIGO_FACTURA  = fac.CODIGO
      INNER JOIN FK2_MES_TEMP mes         ON mes.ID              = fai.MES_TEMP_ID
      INNER JOIN FK2_TB_ANO_LECTIVO al    ON al.CODIGO           = fac.ANO_LECTIVO
      INNER JOIN FK2_TB_PERIODOS per      ON per.CODIGO          = pre.CODIGO_TURNO
      LEFT  JOIN FK2_TIPO_ESTUDANTE_BOLSEIRO_VW vw
             ON  vw.codigo_matricula   = tm.codigo
             AND vw.codigo_ano_lectivo = al.codigo
             AND vw.semestre           = mes.semestre
             AND vw.status_            = 0
    `;

    const sql = `
      SELECT
        fac.CODIGO        AS codigoFactura,
        pag.CODIGO        AS codigoPagamento,
        tm.CODIGO         AS codigoMatricula,
        pre.NOME_COMPLETO AS nomeCompleto,
        fab.DESIGNACAO    AS faculdade,
        cur.DESIGNACAO    AS curso,
        fai.PRECO         AS valorMensalidade,
        al.DESIGNACAO     AS anoLectivo,
        mes.DESIGNACAO    AS mes,
        per.DESIGNACAO    AS periodo,
        fn_tipo_estudante(vw.codigo_bolseiro, vw.renuncia, vw.codigo_tipo_bolsa) AS tipo
      ${baseJoins}
      WHERE ${whereClause}
      ORDER BY pag.CODIGO DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const sqlCount = `
      SELECT COUNT(1) AS TOTAL
      ${baseJoins}
      LEFT JOIN fk2_tb_bolseiros fb
             ON fb.CODIGO_MATRICULA   = tm.CODIGO
            AND fb.CODIGO_ANOLECTIVO  = al.CODIGO
            AND fb.SEMESTRE           = mes.SEMESTRE
            AND fb.STATUS_            = 0
      LEFT JOIN FK2_TB_INSTITUICAO i ON i.CODIGO = fb.CODIGO_INSTITUICAO
      WHERE ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, { ...params, offset, limit }),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);

    return {
      data: toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Exportações ─────────────────────────────────────────────────────────────

  async *exportPaymentMonthly(
    filters: ExportPaymentMonthlyDTO,
  ): AsyncGenerator<string> {
    yield* CsvExportHelper.generate(
      [
        'Codigo Pagamento',
        'Matricula',
        'Tipo de Estudante',
        'Nome',
        'Faculdade',
        'Curso',
        'Turno',
        'Mes/Parcela',
        'Valor',
        'Ano Lectivo',
      ],
      this.iteratePaymentMonthlyRows(filters),
      (row) => [
        row.CODIGOPAGAMENTO,
        row.CODIGOMATRICULA,
        row.TIPO,
        row.NOMECOMPLETO,
        row.FACULDADE,
        row.CURSO,
        row.PERIODO,
        row.MES,
        row.VALORMENSALIDADE,
        row.ANOLECTIVO,
      ],
    );
  }

  async writePaymentMonthlyPdf(
    filters: ExportPaymentMonthlyDTO,
    document: PDFKit.PDFDocument,
  ): Promise<void> {
    await PdfExportHelper.writeTable(
      document,
      this.iteratePaymentMonthlyRows(filters),
      {
        title: 'Mensalidades pagas',
        columns: [
          { label: 'Pagamento', key: 'CODIGOPAGAMENTO', width: 55 },
          { label: 'Matricula', key: 'CODIGOMATRICULA', width: 50 },
          { label: 'Tipo', key: 'TIPO', width: 55 },
          { label: 'Nome', key: 'NOMECOMPLETO', width: 115 },
          { label: 'Faculdade', key: 'FACULDADE', width: 85 },
          { label: 'Curso', key: 'CURSO', width: 105 },
          { label: 'Turno', key: 'PERIODO', width: 45 },
          { label: 'Mes', key: 'MES', width: 55 },
          { label: 'Valor', key: 'VALORMENSALIDADE', width: 55 },
          { label: 'Ano', key: 'ANOLECTIVO', width: 55 },
        ],
      },
    );
  }

  // ── Criação de pagamento ────────────────────────────────────────────────────

  async createPayment(dto: CreatePaymentDto, user: DecodedUserPayload) {
    const cashRegister =
      await this.cashRegistersService.validateOperatorOpenCashRegister(
        user.sub,
      );

    if (!cashRegister) {
      throw new BadRequestException('Você não tem uma caixa aberta');
    }
    if (cashRegister.blocked === YesNo.YES) {
      throw new BadRequestException(
        'Caixa bloqueado, desative para prosseguir',
      );
    }
    if (!dto.caixaId) {
      throw new BadRequestException(
        'Precisa de uma caixa para criar um pagamento',
      );
    }
    if (!dto.codigoFactura) {
      throw new BadRequestException(
        'Precisa de uma fatura para criar um pagamento',
      );
    }

    const anoCorrente = this.anoAtualPrincipal;

    const { nOperacaoBancaria, anoLectivo, ...rest } = dto;
    const cleanText = (value?: string) => value?.replace(/\s+/g, '').trim();
    const cleanNOperacaoBancaria = cleanText(nOperacaoBancaria);

    if (cleanNOperacaoBancaria) {
      const n_op = await this.findPaymentByN_Operacao_Bancaria(
        cleanNOperacaoBancaria,
      );
      if (n_op) {
        throw new BadRequestException(
          `Este Número de Operação Bancária já existe: ${nOperacaoBancaria}`,
        );
      }
    }

    const invoice = await this.invoiceService.findOne(dto.codigoFactura);
    if (!invoice) {
      throw new NotFoundException(`Fatura ${dto.codigoFactura} não encontrada`);
    }

    const negotation = await this.dataSource.query(
      `SELECT * FROM FK2_NEGOCIACAO_DIVIDAS n WHERE n.CODIGO_FATURA = :codigoFactura`,
      { codigoFactura: dto.codigoFactura } as any,
    );

    const existingPayment = await this.findPaymentByCodigoFactura(
      dto.codigoFactura,
    );
    const valorDepositado =
      dto.valorDepositado || existingPayment?.valorDepositado || 0;
    const estados = invoice.ValorAPagar > valorDepositado ? 2 : 1;

    const itens = await this.dataSource.query(
      `
      SELECT
        tp.Codigo AS CodigoProduto,
        tp.Descricao AS DescricaoProduto,
        tp.Preco AS PrecoProduto,
        tp.TipoServico AS TipoServicoProduto,
        tp.sigla AS SiglaProduto,
        fi.codigo AS codigo_fi
      FROM FK2_TB_TIPO_SERVICOS tp
      INNER JOIN FK2_FACTURA_ITEMS fi ON fi.CodigoProduto = tp.Codigo
      WHERE fi.CodigoFactura = :codigoFactura
    `,
      { codigoFactura: dto.codigoFactura } as any,
    );

    let student: any;
    if (invoice.CodigoMatricula) {
      student = await this.findAluno(invoice.CodigoMatricula, 'matricula');
    }
    if (invoice.codigoPreinscricao) {
      student = await this.findAluno(
        invoice.codigoPreinscricao,
        'preinscricao',
      );
    }

    const finalPayload = {
      ...rest,
      totalGeral: invoice.TotalPreco || 0,
      anoLectivo: invoice.anoLectivo,
      codigoFactura: dto.codigoFactura,
      codigoPreInscricao:
        student?.codigo_preinscricao ??
        dto.codigoPreInscricao ??
        invoice.codigoPreinscricao ??
        undefined,
      instituicaoId: undefined,
      nOperacaoBancaria: cleanNOperacaoBancaria,
      nOperacaoBancaria2: undefined,
      fkUtilizador: user?.sub,
      utilizador: user?.sub,
      statusPagamento:
        estados === 1 ? PaymentStatus.CONCLUIDO : PaymentStatus.PENDENTE,
      estado: estados === 1 ? 2 : 1,
      createdAt: new Date(),
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Atualizar estado dos itens da fatura
      if (estados === 1) {
        for (const item of itens) {
          const item_formated = toLowerCaseKeys(item);
          await queryRunner.query(
            `UPDATE FK2_FACTURA_ITEMS SET estado = :estado, VALOR_PAGO = :valor WHERE CODIGO = :codigo`,
            {
              estado: estados,
              codigo: item_formated.codigo_fi,
              valor: item_formated.precoproduto,
            } as any,
          );
        }
      }

      // 2. Atualizar estado da fatura principal
      await queryRunner.query(
        `UPDATE FK2_FACTURA SET estado = :estados WHERE Codigo = :codigo`,
        { estados, codigo: dto.codigoFactura } as any,
      );

      // 3. Siglas anuais
      if (this.hasMatchingSigla(itens, ['tdm', 'ipucricular(anual)'])) {
        await this.handleAnual(queryRunner, invoice);
      }

      // 4. Siglas semestrais
      if (
        this.hasMatchingSigla(itens, ['SEMESTRAL'], { caseSensitive: true })
      ) {
        await this.handleSemestral(queryRunner, invoice);
      }

      // 5. TdEdA
      let tdaResult: { success: boolean; message?: string } | null = null;
      if (this.hasMatchingSigla(itens, ['TdEdA'], { caseSensitive: true })) {
        tdaResult = await this.handleTda(invoice);
      }

      // 6. Criar ou atualizar pagamento
      if (!existingPayment) {
        const payment = this.paymentRepository.create(finalPayload);
        await queryRunner.manager.save(payment);
      } else {
        await queryRunner.manager.update(
          Payment2,
          { codigo: existingPayment.codigo },
          {
            statusPagamento: PaymentStatus.CONCLUIDO,
            nOperacaoBancaria2: cleanNOperacaoBancaria,
            valorDepositado:
              existingPayment.valorDepositado + (dto.valorDepositado || 0),
            formaPagamento: dto.formaPagamento,
            fkUtilizador: user?.sub,
            utilizador: user?.sub,
            updatedAt: new Date(),
          },
        );
      }
      //Registrar o pagamento nos movimentos do estudante
      //Caso dar erro deixar somente assim e nao fazer nada  ...
      if (invoice) {
        try {
          this.studentMovimentUtilService.registrarMovimento({
            estado: 1,
            codigoTipoMovimento: 2,
            matricula: invoice.CodigoMatricula!,
            referencia: invoice.Referencia,
            tipoOperacao: StudentMovimentOperationType.CREDIT,
            valor: fixToInt(valorDepositado),
            factura: invoice.Codigo,
            valorFactura: invoice.ValorAPagar,
          });
        } catch (error: any) {
          console.log(error);
        }
      }

      // 7. Atualizar negociação de dívidas se existir
      if (negotation?.length > 0) {
        const valoRestante = Math.max(
          0,
          negotation[0].VALOR_DIVIDA - valorDepositado,
        );
        await queryRunner.query(
          `UPDATE FK2_NEGOCIACAO_DIVIDAS SET VALORRESTANTE = :valoRestante WHERE CODIGO_FATURA = :codigo`,
          { valoRestante, codigo: dto.codigoFactura } as any,
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: existingPayment
          ? 'Pagamento atualizado com sucesso'
          : 'Pagamento criado com sucesso',
        tda:
          tdaResult && !tdaResult.success
            ? { error: true, message: tdaResult.message }
            : { error: false },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Conta corrente ──────────────────────────────────────────────────────────

  async updateCreditAccount(preinscricao: number, valor: number) {
    if (valor <= 0) throw new BadRequestException('Valor deve ser positivo');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = await queryRunner.query(
        `SELECT SALDO, SALDO_ANTERIOR, SALDO_RESET, SALDO_RESET_ANTER
         FROM FK2_TB_PREINSCRICAO
         WHERE CODIGO = :codigo FOR UPDATE`,
        { codigo: preinscricao } as any,
      );

      if (!rows?.length) throw new BadRequestException('Conta não encontrada');

      const { SALDO, SALDO_RESET } = rows[0];
      const saldo_atual = Number(SALDO || 0);
      const saldo_reset_atual = Number(SALDO_RESET || 0);
      const saldo_final = saldo_atual + valor;
      const saldo_reset_final = saldo_reset_atual + valor;

      await queryRunner.query(
        `UPDATE FK2_TB_PREINSCRICAO
         SET SALDO            = :saldo_final,
             SALDO_ANTERIOR   = :saldo_atual,
             OBS_SALDO        = 'Pagamento de serviços',
             SALDO_RESET      = :saldo_reset_final,
             SALDO_RESET_ANTER = :saldo_reset_atual
         WHERE CODIGO = :codigo`,
        {
          saldo_final,
          saldo_atual,
          saldo_reset_final,
          saldo_reset_atual,
          codigo: preinscricao,
        } as any,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Queries auxiliares públicas ─────────────────────────────────────────────

  async findPaymentByN_Operacao_Bancaria(
    nOperacaoBancaria: string,
  ): Promise<Payment2 | null> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .where('TRIM(UPPER(payment.nOperacaoBancaria)) = TRIM(UPPER(:value))', {
        value: nOperacaoBancaria,
      })
      .getOne();
  }

  async findPaymentByCodigoFactura(
    codigoFactura: number,
  ): Promise<Payment2 | null> {
    return this.paymentRepository.findOne({ where: { codigoFactura } });
  }

  async findPaymentByN_Operacao_Bancaria2(
    nOperacaoBancaria2: string,
  ): Promise<Payment2 | null> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .where('TRIM(UPPER(payment.nOperacaoBancaria2)) = TRIM(UPPER(:value))', {
        value: nOperacaoBancaria2,
      })
      .getOne();
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  private hasMatchingSigla(
    itens: any[],
    siglas: string[],
    options?: { caseSensitive?: boolean; field?: string },
  ): boolean {
    const field = options?.field ?? 'SiglaProduto';
    const caseSensitive = options?.caseSensitive ?? false;

    return itens.some((item) => {
      const siglaItem: string = item[field] ?? item.SIGLAPRODUTO ?? '';
      return siglas.some((s) =>
        caseSensitive
          ? siglaItem === s
          : siglaItem.toLowerCase() === s.toLowerCase(),
      );
    });
  }

  private async handleAnual(
    queryRunner: QueryRunner,
    invoice: InvoiceContext,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE FK2_TB_CONFIRMACOES
       SET estado = :estado
       WHERE codigo_matricula = :codMatricula
       AND codigo_ano_lectivo = :anoLectivo`,
      {
        estado: 1,
        anoLectivo: invoice.anoLectivo,
        codMatricula: invoice.CodigoMatricula,
      } as any,
    );

    await queryRunner.query(
      `UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
       SET CODIGO_STATUS_GRADE_CURRICULAR = :estado
       WHERE codigo_matricula = :codMatricula
       AND codigo_ano_lectivo = :anoLectivo`,
      {
        estado: 2,
        codMatricula: invoice.CodigoMatricula,
        anoLectivo: invoice.anoLectivo,
      } as any,
    );

    await queryRunner.query(
      `UPDATE FK2_TB_MATRICULAS SET ESTADO_MATRICULA = 'activo' WHERE codigo = :codMatricula`,
      { codMatricula: invoice.CodigoMatricula } as any,
    );
  }

  private async handleSemestral(
    queryRunner: QueryRunner,
    invoice: InvoiceContext,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE FK2_TB_CONFIRMACOES
       SET estado = :estado
       WHERE codigo_matricula = :codMatricula
       AND codigo_ano_lectivo = :anoLectivo`,
      {
        estado: 1,
        anoLectivo: invoice.anoLectivo,
        codMatricula: invoice.CodigoMatricula,
      } as any,
    );

    await queryRunner.query(
      `UPDATE FK2_TB_MATRICULAS SET ESTADO_MATRICULA = 'activo' WHERE codigo = :codMatricula`,
      { codMatricula: invoice.CodigoMatricula } as any,
    );

    const [confirmacaoAtual] = await queryRunner.query(
      `
      SELECT SEMESTRE, CODIGO
      FROM FK2_TB_CONFIRMACOES
      WHERE CODIGO_MATRICULA = :codMatricula
      AND CODIGO_ANO_LECTIVO = :anoLectivo
      ORDER BY CODIGO DESC
      FETCH FIRST 1 ROWS ONLY
    `,
      {
        codMatricula: invoice.CodigoMatricula,
        anoLectivo: invoice.anoLectivo,
      } as any,
    );

    await queryRunner.query(
      `UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
       SET CODIGO_STATUS_GRADE_CURRICULAR = :estado
       WHERE codigo_matricula   = :codMatricula
       AND codigo_ano_lectivo   = :anoLectivo
       AND CODIGO_CONFIRMACAO   = :confirmacaoAtual`,
      {
        estado: 2,
        codMatricula: invoice.CodigoMatricula,
        anoLectivo: invoice.anoLectivo,
        confirmacaoAtual: confirmacaoAtual.CODIGO,
      } as any,
    );
  }

  private async handleTda(
    invoice: InvoiceContext,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (invoice.codigoPreinscricao) {
        await AtribuirProvaHelper.atribuirProvaSync(this.httpService, {
          codigoCandidato: invoice.codigoPreinscricao,
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao atribuir prova:', error);
      if (error instanceof AxiosError) {
        return {
          success: false,
          message:
            error.response?.data?.message || 'Serviço de exames indisponível',
        };
      }
      return { success: false, message: 'Erro inesperado ao atribuir prova' };
    }
  }

  private async findAluno(codigo: number | string, by: FindAlunoBy) {
    const whereClause =
      by === 'matricula' ? `m.codigo = ${codigo}` : `p.codigo = ${codigo}`;

    const sql = `
      SELECT p.codigo AS codigo_preinscricao, m.codigo AS codigo_matricula
      FROM FK2_TB_PREINSCRICAO p
      LEFT JOIN FK2_TB_ADMISSAO a  ON a.PRE_INCRICAO = p.codigo
      LEFT JOIN FK2_TB_MATRICULAS m ON m.CODIGO_ALUNO = a.codigo
      WHERE ${whereClause}
    `;

    const result = await this.dataSource.query(sql);
    if (!result?.length) throw new NotFoundException('Aluno não encontrado');
    return toLowerCaseKeys(result[0]);
  }

  private async *iteratePaymentMonthlyRows(
    filters: ExportPaymentMonthlyDTO,
  ): AsyncGenerator<PaymentMonthlyExportRow[]> {
    const {
      codigoAnoLectivo,
      codigoCurso,
      codigoPagamento,
      codigoFaculdade,
      codigoMatricula,
      codigoPeriodo,
      nome,
      mesId,
    } = filters;

    const conditions: string[] = ['fac.ESTADO = 1'];
    const params: Record<string, string | number> = {};

    if (codigoPagamento) {
      conditions.push('pag.CODIGO = :codigoPagamento');
      params.codigoPagamento = codigoPagamento;
    }
    if (codigoCurso) {
      conditions.push('cur.CODIGO = :codigoCurso');
      params.codigoCurso = codigoCurso;
    }
    if (codigoAnoLectivo) {
      conditions.push('al.CODIGO  = :codigoAnoLectivo');
      params.codigoAnoLectivo = codigoAnoLectivo;
    }
    if (codigoFaculdade) {
      conditions.push('fab.CODIGO = :codigoFaculdade');
      params.codigoFaculdade = codigoFaculdade;
    }
    if (codigoMatricula) {
      conditions.push('tm.CODIGO  = :codigoMatricula');
      params.codigoMatricula = codigoMatricula;
    }
    if (codigoPeriodo) {
      conditions.push('per.CODIGO = :codigoPeriodo');
      params.codigoPeriodo = codigoPeriodo;
    }
    if (mesId) {
      conditions.push('mes.ID     = :mesId');
      params.mesId = mesId;
    }
    if (nome) {
      conditions.push(`
        fn_remove_acentos(UPPER(pre.NOME_COMPLETO))
        LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'
      `);
      params.nome = nome;
    }

    const whereClause = conditions.join(' AND ');
    const batchSize = 1000;
    let offset = 0;

    while (true) {
      const rows = (await this.dataSource.query(
        `
          SELECT
            pag.CODIGO   AS CODIGOPAGAMENTO,
            tm.CODIGO    AS CODIGOMATRICULA,
            fn_tipo_estudante(
              vw.codigo_bolseiro,
              vw.renuncia,
              vw.codigo_tipo_bolsa
            )            AS TIPO,
            pre.NOME_COMPLETO AS NOMECOMPLETO,
            fab.DESIGNACAO    AS FACULDADE,
            cur.DESIGNACAO    AS CURSO,
            per.DESIGNACAO    AS PERIODO,
            mes.DESIGNACAO    AS MES,
            fai.PRECO         AS VALORMENSALIDADE,
            al.DESIGNACAO     AS ANOLECTIVO
          FROM FK2_TB_MATRICULAS tm
          INNER JOIN FK2_TB_ADMISSAO ad      ON ad.CODIGO  = tm.CODIGO_ALUNO
          INNER JOIN FK2_TB_PREINSCRICAO pre ON pre.CODIGO = ad.PRE_INCRICAO
          INNER JOIN FK2_TB_CURSOS cur       ON cur.CODIGO = tm.CODIGO_CURSO
          INNER JOIN FK2_TB_FACULDADE fab    ON fab.CODIGO = cur.FACULDADE_ID
          INNER JOIN FK2_FACTURA fac         ON fac.CODIGOMATRICULA = tm.CODIGO
          INNER JOIN FK2_FACTURA_ITEMS fai   ON fai.CODIGOFACTURA   = fac.CODIGO
          INNER JOIN FK2_TB_PAGAMENTOS pag   ON pag.CODIGO_FACTURA  = fac.CODIGO
          INNER JOIN FK2_MES_TEMP mes        ON mes.ID              = fai.MES_TEMP_ID
          INNER JOIN FK2_TB_ANO_LECTIVO al   ON al.CODIGO           = fac.ANO_LECTIVO
          INNER JOIN FK2_TB_PERIODOS per     ON per.CODIGO          = pre.CODIGO_TURNO
          LEFT  JOIN FK2_TIPO_ESTUDANTE_BOLSEIRO_VW vw
                 ON  vw.codigo_matricula   = tm.codigo
                 AND vw.codigo_ano_lectivo = al.codigo
                 AND vw.semestre           = mes.semestre
                 AND vw.status_            = 0
          WHERE ${whereClause}
          ORDER BY pag.CODIGO DESC, fac.CODIGO DESC, fai.CODIGO DESC
          OFFSET :offset ROWS FETCH NEXT :batchSize ROWS ONLY
        `,
        { ...params, offset, batchSize } as any,
      )) as PaymentMonthlyExportRow[];

      if (rows.length === 0) break;

      yield rows;
      offset += rows.length;

      if (rows.length < batchSize) break;
    }
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { StudentPaymentsQueryDto } from './dto/student-payment.dto';
import { DecodedUserPayload } from 'src/common/types/token-validation-response.interface';
import { UpdateAddDiscountDto } from '../discount/dto/update-add-discount.dto';
import { Payment2 } from './entities/payment2.entity';
import { ListPaymentDTO } from './dto/list-payment.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

export enum PaymentStatus {
  CONCLUIDO = 'concluido',
  PENDENTE = 'pendente',
}

@Injectable()
export class PaymentService {
  private anoAtualPrincipal: number;
  constructor(
    private readonly anoLectivoUtil: AnoLectivoUtil,
    @InjectRepository(Payment2)
    private readonly paymentRepository: Repository<Payment2>,
    private readonly invoiceService: InvoiceService,
    private dataSource: DataSource,
  ) {
    this.initAnoAtual();
  }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }

  /**
   * Busca Pagamentos, Faturas e seus Itens em formato "flat" (plano) com paginação,
   * incluindo a descrição do serviço, "filtrando" pelo Ano Lectivo e Código de Pré-Inscrição.
   *
   * @param anoLectivo O ID do ano lectivo.
   * @param codigoPreInscricao O código da pré-inscrição.
   * @param paginationQuery O DTO de paginação (limit e page).
   * @returns Uma Promise que resolve para um PagedResult contendo os resultados planos.
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

    // CONTAGEM
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
        // PAGAMENTO
        '"p"."Codigo" AS "CodigoPagamento"',
        '"p"."Data" AS "DataPagamento"',
        '"p"."N_Operacao_Bancaria" AS "p_N_Operacao_Bancaria"',
        '"p"."valor_depositado" AS "p_valor_depositado"',
        '"p"."status_pagamento" AS "p_status_pagamento"',
        '"p"."created_at" AS "DataRegistoPagamento"',
        '"p"."statusMovimento" AS "p_statusMovimento"',
        '"p"."ContaMovimentada" AS "p_ContaMovimentada"',
        '"p"."forma_pagamento" AS "p_forma_pagamento"',

        // FATURA
        '"f"."Codigo" AS "CodigoFactura"',
        '"f"."Descricao" AS "Descricao_factura"',
        '"f"."DataFactura" AS "f_DataFactura"',
        '"f"."Referencia" AS "f_Referencia"',
        '"f"."estado" AS "EstadoFactura"',
        '"f"."ValorAPagar" AS "f_ValorAPagar"',
        '"f"."TotalPreco" AS "TotalBrutoFactura"',
        '"f"."TotalMulta" AS "TotalMultaFactura"',

        // ITEM
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

        // PRODUTO
        '"tp"."Descricao" AS "Descricao_produto"',
      ])
      // .distinct(true)
      // .offset(skip)
      // .limit(limit)
      .orderBy('"p"."DataRegisto"', 'DESC')
      .addOrderBy('"f"."DataFactura"', 'DESC')
      .addOrderBy('"fi"."codigo"', 'ASC')
      .getRawMany();

    return {
      data: results,
      total,
      page,
      limit,
      totalPages,
    };
  }
  async createPayment(dto: CreatePaymentDto, user: DecodedUserPayload) {
    const anoCorrente = this.anoAtualPrincipal;
    const { nOperacaoBancaria, anoLectivo, ...rest } = dto;
    if (!nOperacaoBancaria) {
      throw new BadRequestException('Precisa de uma operação bancária');
    }

    const n_op = await this.findPaymentByN_Operacao_Bancaria(nOperacaoBancaria);
    if (n_op) {
      throw new BadRequestException(
        `Este Número de Operação Bancária já existe: ${nOperacaoBancaria}`,
      );
    }

    if (!dto.codigoFactura) {
      throw new BadRequestException(
        'Precisa de uma fatura para criar um pagamento',
      );
    }

    const invoice = await this.invoiceService.findOne(dto.codigoFactura);
    if (!invoice) {
      throw new NotFoundException(`Fatura ${dto.codigoFactura} não encontrada`);
    }

    // vrificar se já existe um pagamento associado a esta fatura
    const existingPayment = await this.findPaymentByCodigoFactura(
      dto.codigoFactura,
    );
    const valorDepositado =
      dto.valorDepositado || existingPayment?.valorDepositado || 0;
    // 1. Atualizar estado de todos os itens da factura
    const estados = invoice.TotalPreco > valorDepositado ? 2 : 1;
    // Buscar os itens (pode ser fora da transação, pois é só leitura)
    const itens = await this.dataSource.query(
      `
        SELECT
            tp.Codigo AS CodigoProduto,
            tp.Descricao AS DescricaoProduto,
            tp.Preco AS PrecoProduto,
            tp.TipoServico AS TipoServicoProduto,
            tp.sigla AS SiglaProduto,
            fi.*
        FROM FK2_TB_TIPO_SERVICOS tp
        INNER JOIN FK2_FACTURA_ITEMS fi ON fi.CodigoProduto = tp.Codigo
        WHERE fi.CodigoFactura = :codigoFactura
    `,
      { codigoFactura: dto.codigoFactura } as any,
    );

    // Aqui você pode fazer validações adicionais, por exemplo:
    // - Verificar se o valor pago ≥ valor total da factura
    // - Decidir se é pagamento completo ou parcial
    const student = await this.findAlunoPreinscricaoByMatricula(
      invoice.CodigoMatricula,
    );

    const finalPayload = {
      ...rest,

      anoLectivo: anoLectivo ?? anoCorrente,
      codigoFactura: dto.codigoFactura,
      codigoPreInscricao:
        student?.codigo ??
        dto.codigoPreInscricao ??
        invoice.codigoPreinscricao ??
        undefined,
      instituicaoId: undefined,
      nOperacaoBancaria: nOperacaoBancaria,
      nOperacaoBancaria2: undefined,
      fkUtilizador: user?.sub, // Associar o pagamento ao ID do usuário autenticado
      utilizador: user?.sub, // Campo "utilizador" para compatibilidade, também associando ao ID do usuário autenticado
      statusPagamento:
        estados === 1 ? PaymentStatus.CONCLUIDO : PaymentStatus.PENDENTE,
      estado: estados === 1 ? 2 : 1, // Atualizar o estado da factura: 1 para pago, 2 para parcialmente pago
      createdAt: new Date(),
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (estados == 1) {
        for (const item of itens) {
          await queryRunner.query(
            `
                UPDATE FK2_FACTURA_ITEMS
                SET estado = :estado
                WHERE Codigo = :codigo
            `,
            { estado: estados, codigo: item.Codigo } as any,
          );
        }
      }
      // 2. Atualizar estado da factura principal
      await queryRunner.query(
        `
            UPDATE FK2_FACTURA
            SET estado = :estados
            WHERE Codigo =:codigo
        `,
        {
          estados,
          codigo: dto.codigoFactura,
        } as any,
      );

      const SIGLAS_ESPECIAIS1 = ['TdM', 'IpuCricular(Anual)']; // para anual, se tiver algum desses itens, precisa de confirmação para activar a matrícula e grade curricular do aluno
      const precisaConfirmacao = itens.some((item: any) =>
        SIGLAS_ESPECIAIS1.includes(item.SiglaProduto),
      );
      if (precisaConfirmacao) {
        // Atualizar confirmação

        await queryRunner.query(
          `
        update FK2_TB_CONFIRMACOES
        set estado = :estado
        where 1=1
        and codigo_matricula = :codMatricula
        and codigo_ano_lectivo = :anoLectivo;
        update FK2_TB_MATRICULAS
        set ESTADO_MATRICULA = 'activo'
        where codigo = :codMatricula;
            `,
          {
            estado: 1,
            anoLectivo: invoice.anoLectivo,
            codMatricula: invoice.CodigoMatricula,
          } as any,
        );

        // Atualizar  grade curricular do aluno
        await queryRunner.query(
          `
        update FK2_TB_GRADE_CURRICULAR_ALUNO
        set CODIGO_STATUS_GRADE_CURRICULAR = :estado
        where 1=1
        and codigo_matricula = :codMatricula
        and codigo_ano_lectivo = :anoLectivo;
        update FK2_TB_MATRICULAS
        set ESTADO_MATRICULA = 'activo'
        where codigo = :codMatricula;
            `,
          {
            estado: 2,
            codMatricula: invoice.CodigoMatricula,
            anoLectivo: invoice.anoLectivo,
          } as any,
        );
      }
      const SIGLAS_ESPECIAIS2 = ['SEMESTRAL']; // para anual, se tiver algum desses itens, precisa de confirmação para activar a matrícula e grade curricular do aluno
      const precisaConfirmacaoSemestral = itens.some((item: any) =>
        SIGLAS_ESPECIAIS2.includes(item.SiglaProduto),
      );
      if (precisaConfirmacaoSemestral) {
        // Atualizar confirmação

        await queryRunner.query(
          `
        update FK2_TB_CONFIRMACOES
        set estado = :estado
        where 1=1
        and codigo_matricula = :codMatricula
        and codigo_ano_lectivo = :anoLectivo;
        update FK2_TB_MATRICULAS
        set ESTADO_MATRICULA = 'activo'
        where codigo = :codMatricula;
            `,
          {
            estado: 1,
            anoLectivo: invoice.anoLectivo,
            codMatricula: invoice.CodigoMatricula,
          } as any,
        );

        // Atualizar  grade curricular do aluno  com base no semestre atual
        const confirmacaoAtual = await queryRunner.query(
          `
    SELECT SEMESTRE,CODIGO
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
          `
        update FK2_TB_GRADE_CURRICULAR_ALUNO
        set CODIGO_STATUS_GRADE_CURRICULAR = :estado
        where 1=1
        and codigo_matricula = :codMatricula
        and codigo_ano_lectivo = :anoLectivo;
        and CODIGO_CONFIRMACAO = :confirmacaoAtual;
        update FK2_TB_MATRICULAS
        set ESTADO_MATRICULA = 'activo'
        where codigo = :codMatricula;
            `,
          {
            estado: 2,
            codMatricula: invoice.CodigoMatricula,
            anoLectivo: invoice.anoLectivo,
            confirmacaoAtual: confirmacaoAtual[0].CODIGO,
          } as any,
        );
      }

      if (!existingPayment) {
        const payment = this.paymentRepository.create(finalPayload);
        await queryRunner.manager.save(payment);
      } else {
        // Se já existe um pagamento para esta fatura, atualizamos o registro existente
        const valorDepositadoAtualizado =
          existingPayment.valorDepositado + (dto.valorDepositado || 0);
        const updatedPayment = {
          statusPagamento: PaymentStatus.CONCLUIDO,
          nOperacaoBancaria2: dto.nOperacaoBancaria,
          valorDepositado: valorDepositadoAtualizado,
          formaPagamento: dto.formaPagamento,
          fkUtilizador: user?.sub,
          utilizador: user?.sub,

          updatedAt: new Date(),
        };
        console.log(updatedPayment);

        await queryRunner.manager.update(
          Payment2,
          { codigo: existingPayment.codigo },
          updatedPayment,
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: existingPayment
          ? 'Pagamento atualizado com sucesso'
          : 'Pagamento criado com sucesso',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async findPaymentByN_Operacao_Bancaria(
    nOperacaoBancaria: string,
  ): Promise<Payment2 | null> {
    return this.paymentRepository.findOne({ where: { nOperacaoBancaria } });
  }
  async findPaymentByCodigoFactura(
    codigoFactura: number,
  ): Promise<Payment2 | null> {
    return this.paymentRepository.findOne({ where: { codigoFactura } });
  }
  async findPaymentByN_Operacao_Bancaria2(
    nOperacaoBancaria2: string,
  ): Promise<Payment2 | null> {
    return this.paymentRepository.findOne({ where: { nOperacaoBancaria2 } });
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
        INNER JOIN FK2_FACTURA_ITEMS ffi
                ON f.CODIGO = ffi.CODIGOFACTURA
        INNER JOIN FK2_TB_TIPO_SERVICOS tp
                ON ffi.CODIGOPRODUTO = tp.CODIGO
        WHERE f.CODIGO = :facturaCode
        ORDER BY DBMS_LOB.SUBSTR(tp.DESCRICAO, 4000, 1)
    `;

    return await this.dataSource.query(sql, [facturaCode]);
  }

  private async findAlunoPreinscricaoByMatricula(codigo) {
    const sql = `select p.codigo from fk2_tb_matriculas    m
      inner join FK2_TB_ADMISSAO         a on a.codigo = m.CODIGO_ALUNO
      inner join FK2_TB_PREINSCRICAO     p on p.codigo = a.PRE_INCRICAO
      where m.codigo =  ${codigo}`;
    const result = await this.dataSource.query(sql);
    if (!result || result.length === 0) {
      throw new NotFoundException('Aluno não encontrado');
    }
    const preInscricao = result[0];
    return preInscricao;
  }

  public async findPayments(filters: ListPaymentDTO) {
    const {
      anoLectivo,
      codigoFactura,
      codigoMatricula,
      estado,
      nome,
      page = 1,
      limit = 25,
    } = filters;

    const offset = (page - 1) * limit;

    let baseWhere = `1=1`;

    if (anoLectivo) {
      baseWhere += ` AND fac.ANO_LECTIVO = ${anoLectivo}`;
    }

    if (codigoFactura) {
      baseWhere += ` AND fac.CODIGO = ${codigoFactura}`;
    }

    if (codigoMatricula) {
      baseWhere += ` AND mac.CODIGO = ${codigoMatricula}`;
    }

    if (estado) {
      const statusPagamento = estado == 2 ? 'pendente' : 'concluido';
      baseWhere += ` AND pg.status_pagamento = '${statusPagamento}'`;
    }

    if (nome) {
      baseWhere += `
      AND fn_remove_acentos(UPPER(pre.NOME_COMPLETO))
      LIKE '%' || fn_remove_acentos(UPPER('${nome}')) || '%'
    `;
    }

    const sql = `
    SELECT
      pg.codigo                   AS codigo_pagamento,
      to_char(pg.dataregisto, 'YYYY-MM-DD"T"HH24:MI:SS')                     AS data_registro,
      pg.N_OPERACAO_BANCARIA      AS operacao_bancaria,
      pg.N_OPERACAO_BANCARIA2     AS seg_operacao_bancaria,
      pg.anolectivo               AS anolectivo,
      pg.totalgeral               AS totalgeral,
      pg.databanco                AS databanco,
      COALESCE (fp.descricao ,pg.forma_pagamento)          AS forma_pagamento,
      pg.valor_depositado         AS valor_depositado,
      pg.contamovimentada         AS conta_movimentada,
      pg.estado                   AS estado_pagamento,
      pg.tipo_pagamento           AS tipo_pagamento,
      pg.status_pagamento         AS status_pagamento,
      pg.updated_at               AS data_actualizacao,
      pg.data_operacao            AS data_operacao,
      cai.nome                    AS caixa,
      pre.nome_completo           AS nome_completo,
      mac.codigo                  AS codigo_matricula,
      cur.designacao              AS curso,
      fac.codigo                  AS codigo_factura,
      can.designacao              as canal

    FROM FK2_TB_PAGAMENTOS pg
      INNER JOIN FK2_FACTURA fac             ON fac.codigo = pg.codigo_factura
      INNER JOIN FK2_TB_MATRICULAS mac       ON mac.codigo = fac.CODIGOMATRICULA
      INNER JOIN FK2_TB_ADMISSAO adm         ON adm.codigo = mac.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pre     ON pre.codigo = adm.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS cur           ON cur.codigo = mac.codigo_curso
      LEFT JOIN FK2_TB_CAIXAS cai            ON cai.codigo = pg.caixa_id
      LEFT JOIN fk2_tb_canal_comunicacao can ON can.codigo = pg.canal
      LEFT JOIN FK2_TB_FORMA_PAGAMENTO   fp  ON to_char(fp.codigo)  = pg.forma_pagamento
    WHERE ${baseWhere}
    ORDER BY pg.codigo DESC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_PAGAMENTOS pg
      INNER JOIN FK2_FACTURA fac        ON fac.codigo = pg.codigo_factura
      INNER JOIN FK2_TB_MATRICULAS mac  ON mac.codigo = fac.CODIGOMATRICULA
      INNER JOIN FK2_TB_ADMISSAO adm    ON adm.codigo = mac.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pre ON pre.codigo = adm.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS cur      ON cur.codigo = mac.codigo_curso
      INNER JOIN FK2_TB_CAIXAS cai      ON cai.codigo = pg.caixa_id
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}

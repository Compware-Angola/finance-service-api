import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  IsNull,
  Repository,
} from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { InvoiceFilterEnrollmentDto } from './dto/Invoice-filter-enrollment-code.dto';
import * as oracledb from 'oracledb';
import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { AcademicYear } from './entities/academic.year.entity';
import { genearateKeyNumber } from '../util/generate-key-number';
import { generateDueDate } from '../util/generate-due-date';
import { InvoiceItem } from './entities/InvoiceIten.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { InvoiceSearchDto } from './dto/get-invoice.dto';
import { normalizeParam } from '../util/normalize-util';
import { InvoiceItemEnum } from 'src/common/enums/invoice-item.enum';
import { InvoiceEnum } from 'src/common/enums/invoice.enum';

type ExemptionType = { CODIGO: number; SIGLA: string };

//0 - pendente,
//1 - validado
//2 - parcelarmente pago
//3 - eliminado
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  constructor(
    @InjectQueue('invoice_service')
    private readonly invoiceQueue: Queue,

    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,

    @InjectRepository(TypeInvoiceDocument)
    private readonly typeInvoiceDocumentRepository: Repository<TypeInvoiceDocument>,
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,

    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly hashService: InvoiceNumberingAndHashService,
    private readonly dataSource: DataSource,
  ) {
    Invoice.setRepository(this.invoiceRepository);
    InvoiceItem.setRepository(this.invoiceItemRepository);
  }
  /**
   * Cria e salva uma nova fatura no banco de dados, "incluindo" a geração de hash e sequenciamento.
   * @param createInvoiceDto Dados da nova fatura.
   * @returns A fatura criada.
   */

  // No teu service (ex: InvoiceService)
  async create(
    createInvoiceDto: CreateInvoiceDto,
    referenceParams?: string,
    dueDateParams?: string,
    transactionalEntityManager?: EntityManager,
  ): Promise<Invoice> {
    // Caso 1: Transação externa (já veio manager → não commit/rollback aqui)
    if (transactionalEntityManager) {
      return this.createInternal(
        createInvoiceDto,
        referenceParams,
        dueDateParams,
        transactionalEntityManager,
      );
    }

    // Caso 2: Transação interna (criamos e controlamos o queryRunner)
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.createInternal(
        createInvoiceDto,
        referenceParams,
        dueDateParams,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar fatura (transação interna)', err?.stack);

      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }

      throw new InternalServerErrorException(
        'Erro interno ao criar fatura. Verifique os dados e tente novamente.',
      );
    } finally {
      await queryRunner.release();
    }
  }
  async annulInvoice(Codigo: number): Promise<Invoice> {
    const invoice = await this.findOne(Codigo);
    if (!invoice) {
      throw new NotFoundException(
        `Fatura com Código ${Codigo} não encontrada.`,
      );
    }

    invoice.estado = 3; // 3 - eliminado
    return this.invoiceRepository.save(invoice);
  }
  async reactivateInvoice(Codigo: number): Promise<Invoice> {
    const invoice = await this.findOne(Codigo);

    if (!invoice) {
      throw new NotFoundException(
        `Fatura com Código ${Codigo} não encontrada.`,
      );
    }

    invoice.estado = 0; // 0 - pendente
    return this.invoiceRepository.save(invoice);
  }
  /**
   * Lógica principal de criação da fatura e itens.
   * Sempre recebe um EntityManager válido (interno ou externo).
   */
  private async createInternal(
    createInvoiceDto: CreateInvoiceDto,
    referenceParams: string | undefined,
    dueDateParams: string | undefined,
    manager: EntityManager,
  ): Promise<Invoice> {
    let { itens, ...invoiceData } = createInvoiceDto;

    // 1. Referência e data de vencimento
    const referencia = referenceParams || (await genearateKeyNumber(9)); // ajusta o nome/método se for diferente
    const dataVencimento = dueDateParams || (await generateDueDate(10)); // ajusta se for diferente

    // 2. Validar tipo de documento da fatura
    const tipoDocId = createInvoiceDto.tipo_documento_factura_id ?? 2;
    const tipoDoc = await manager.findOne(
      this.typeInvoiceDocumentRepository.target,
      {
        where: { id: tipoDocId },
        select: ['sigla'],
      },
    );

    if (!tipoDoc) {
      throw new NotFoundException(
        `Tipo de documento de fatura com ID ${tipoDocId} não encontrado.`,
      );
    }

    const tipoDocumentoSigla = tipoDoc.sigla;

    // 3. Ano letivo activo
    const anoLetivo = await manager.findOne(
      this.academicYearRepository.target,
      {
        where: { estado: 'Activo' },
        select: ['Codigo', 'Designacao'],
      },
    );

    if (!anoLetivo) {
      throw new NotFoundException(
        'Não existe ano letivo activo configurado no sistema.',
      );
    }

    // 4. Gerar dados do hash/numeração da fatura
    const hashData = await this.hashService.generateInvoiceHashData(
      invoiceData.TotalPreco ?? 0,
      tipoDocId,
      anoLetivo.Codigo,
      invoiceData.polo_id ?? 1,
      tipoDocumentoSigla,
      anoLetivo.Designacao,
    );

    //4.1 Verificar a Isenção
    //4.2 Pegar todos os serviços que estão dentro da tabela de Isenções
    const invoiceProductCodes = itens?.map((item) => item.CodigoProduto) ?? [];
    let totalExemptionAmount = 0;

    if (invoiceProductCodes.length > 0) {
      const servicePlaceholders = invoiceProductCodes
        .map((_, i) => `:service${i}`)
        .join(', ');
      const queryParams: any = {
        academicYear: invoiceData.codigo_anoLectivo ?? anoLetivo.Codigo,
        studentId: createInvoiceDto?.CodigoMatricula,
      };
      invoiceProductCodes.forEach((code, i) => {
        queryParams[`service${i}`] = code;
      });

      const exemptionResults: ExemptionType[] = await manager.query(
        `
    SELECT
      s1.codigo,
      s1.sigla
    FROM FK2_TB_TIPO_SERVICOS s1
    WHERE s1.codigo IN (${servicePlaceholders})
      AND s1.SIGLA NOT IN ('IpuC','IpuCricular(Anual)','TdM','PROP')
      AND s1.sigla IN (
        SELECT s2.SIGLA
        FROM FK2_TB_ISENCOES i1
        INNER JOIN FK2_TB_TIPO_SERVICOS s2 ON s2.codigo = i1.CODIGO_SERVICO
        WHERE i1.CODIGO_MATRICULA = :studentId
          AND UPPER(i1.ESTADO_ISENSAO) = 'ACTIVO'
          AND i1.CODIGO_ANOLECTIVO = :academicYear

      )
    `,
        queryParams,
      );

      const exemptedServices = Array.isArray(exemptionResults)
        ? exemptionResults
        : [];
      if (exemptedServices.length > 0) {
        const exemptedCodesSet = new Set(exemptedServices.map((s) => s.CODIGO));
        itens = itens?.map((item) => {
          if (!exemptedCodesSet.has(item.CodigoProduto)) return item;
          totalExemptionAmount += item.Total ?? item.Quantidade * item.preco;
          return { ...item, estado: InvoiceItemEnum.ISENTO };
        });
      }
    }

    let invoiceAmount = invoiceData.ValorAPagar ?? invoiceData.TotalPreco ?? 0;
    let invoiceStatus = 0;

    if (invoiceAmount > 0) {
      invoiceStatus =
        Math.abs(invoiceAmount - totalExemptionAmount) < 0.01
          ? InvoiceEnum.ISENTO
          : InvoiceEnum.PENDENTE;
      invoiceAmount -= totalExemptionAmount;
    }

    // 5. Inserir a fatura (CODIGO gerado automaticamente pela sequence + trigger)

    const insertResult = await manager.query(
      `
    INSERT INTO FK2_FACTURA (
      DATAFACTURA,
      TOTALPRECO,
      CODIGOMATRICULA,
      REFERENCIA,
      DESCONTO,
      TOTALIVA,
      TOTALMULTA,
      TOTAL_INCIDENCIA,
      TOTAL_RETENCAO,
      VALORAPAGAR,
      VALORENTREGUE,
      VALORAPAGAREXTENSO,
      DESCRICAO,
      VALORENTREGUEMLTCX,
      CODIGO_DESCRICAO,
      NEXTFACTURA,
      NEXT,
      TEXTO_HASH,
      DATAVENCIMENTO,
      POLO_ID,
      OBS,
      HASHVALOR,
      CONTACORRENTE,
      FATURAREFERENCE,
      CANAL,
      ANO_LECTIVO,
      ESTADO,
      CORRENTE,
      CODIGO_PREINSCRICAO,
      NUMSEQUENCIAFACTURA,
      TIPO_DOCUMENTO_FACTURA_ID,
      VALORISENTO
    ) VALUES (
      SYSDATE,
      :totalPreco,
      :codigoMatricula,
      :referencia,
      :desconto,
      :totalIva,
      :totalMulta,
      :totalIncidencia,
      :totalRetencao,
      :valorAPagar,
      0,
      :valorAPagarExtenso,
      :descricao,
      0,
      :codigoDescricao,
      :nextFactura,
      :next,
      :textoHash,
      :dataVencimento,
      :poloId,
      :obs,
      :hashValor,
      :contaCorrente,
      :faturaReference,
      :canal,
      :anoLectivo,
      :invoiceStatus,
      0,
      :codigoPreInscricao,
      :numSequenciaFactura,
      :tipoDocumentoFacturaId,
      :valorIsento
    )

     RETURNING CODIGO INTO :outId
  `,
      {
        totalPreco: invoiceData.TotalPreco ?? 0,
        codigoMatricula: invoiceData.CodigoMatricula ?? null,
        referencia,
        desconto: invoiceData.Desconto ?? 0,
        totalIva: invoiceData.totalIVA ?? 0,
        totalMulta: invoiceData.TotalMulta ?? 0,
        totalIncidencia: invoiceData.total_incidencia ?? 0,
        totalRetencao: invoiceData.total_retencao ?? 0,
        valorAPagar: invoiceAmount,
        valorAPagarExtenso: '', // podes implementar função para gerar por extenso
        descricao: invoiceData.Descricao ?? '',
        codigoDescricao: invoiceData.codigo_descricao ?? 101,
        nextFactura: hashData.numeracaoFactura,
        next: hashData.numeracaoFactura,
        textoHash: hashData.plaintext,
        dataVencimento: new Date(dataVencimento),
        poloId: invoiceData.polo_id ?? 1,
        obs: '',
        hashValor: hashData.hashValor?.slice(0, 255) ?? '',
        contaCorrente: '',
        faturaReference: '',
        canal: invoiceData.canal ?? 3,
        anoLectivo: invoiceData.codigo_anoLectivo ?? anoLetivo.Codigo,
        codigoPreInscricao: invoiceData.codigo_preinscricao ?? null,
        numSequenciaFactura: hashData.numSequenciaFactura,
        tipoDocumentoFacturaId: tipoDocId,
        invoiceStatus: invoiceStatus,
        valorIsento: totalExemptionAmount,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    const codigoGerado = insertResult.outId[0];

    if (!codigoGerado) {
      throw new InternalServerErrorException(
        'Falha ao recuperar o CODIGO gerado automaticamente para a fatura.',
      );
    }

    // 6. Recarregar a fatura completa
    const savedInvoice = await manager.findOneOrFail(
      this.invoiceRepository.target,
      {
        where: { Codigo: codigoGerado },
      },
    );

    // 7. Inserir os itens da fatura (se existirem)
    if (itens && itens?.length > 0) {
      for (const itemDto of itens) {
        await manager.query(
          `
        INSERT INTO FK2_FACTURA_ITEMS (
          CODIGOPRODUTO,
          CODIGOFACTURA,
          QUANTIDADE,
          TOTAL,
          OBS,
          TAXA_IVA,
          VALOR_IVA,
          PRECO,
          RETENCAO,
          INCIDENCIA,
          VALOR_DESCONTO,
          DESCONTOPRODUTO,
          MES,
          MULTA,
          MES_TEMP_ID,
          CODIGO_ANOLECTIVO,
          ESTADO,
          VALOR_PAGO,
          VALOR_A_TRANSPORTAR
        ) VALUES (
          :codigoProduto,
          :codigoFactura,
          :quantidade,
          :total,
          :obs,
          :taxaIva,
          :valorIva,
          :preco,
          :retencao,
          :incidencia,
          :valorDesconto,
          :descontoProduto,
          :mes,
          :multa,
          :mesTempId,
          :codigoAnoLectivo,
          :estado,
          :valorPago,
          :valorATransportar
        )
      `,
          {
            codigoProduto: itemDto.CodigoProduto,
            codigoFactura: codigoGerado,
            quantidade: itemDto.Quantidade ?? 1,
            total: itemDto.Total ?? 0,
            obs: (itemDto.obs ?? `Item da fatura ${codigoGerado}`).substring(
              0,
              45,
            ),
            taxaIva: itemDto.taxaIva ?? 0,
            valorIva: itemDto.valorIva ?? 0,
            preco: itemDto.preco ?? 0,
            retencao: itemDto.retencao ?? 0,
            incidencia: itemDto.incidencia ?? 0,
            valorDesconto: itemDto.valorDesconto ?? 0,
            descontoProduto: itemDto.descontoProduto ?? 0,
            mes: itemDto.mes ?? null,
            multa: itemDto.multa ?? 0,
            mesTempId: itemDto.mesTempId ?? null,
            codigoAnoLectivo:
              itemDto.codigo_anoLectivo ?? savedInvoice.anoLectivo,
            estado: itemDto.estado ?? 0,
            valorPago: itemDto.valorPago ?? 0,
            valorATransportar: itemDto.valorATransportar?.toString() ?? null,
          } as any,
        );
      }
    }

    return savedInvoice;
  }

  /**
   * Retorna todas as faturas com paginação.
   * @param paginationQuery O DTO com os parâmetros de paginação (page e limit).
   * @returns Um objeto contendo a lista de faturas, total e informações de paginação.
   */
  async findInvoices(filter: InvoiceSearchDto): Promise<PagedResult<any>> {
    const {
      anoLectivo,
      codigoMatricula,
      reference,
      limit = 10,
      page = 1,
      status,
      codigoFatura,
    } = filter;

    const startRow = (page - 1) * limit + 1;
    const endRow = page * limit;

    // WHERE dinâmico
    const whereConditions: string[] = [];
    const dataQueryParams: any = { startRow, endRow };
    const countQueryParams: any = {};

    const estado = normalizeParam(status);
    if (estado !== undefined && estado !== null) {
      whereConditions.push(`f.estado = :estado`);
      dataQueryParams.estado = status;
      countQueryParams.estado = status;
    }

    if (anoLectivo) {
      whereConditions.push(`f.ano_lectivo = :anoLectivo`);
      dataQueryParams.anoLectivo = anoLectivo;
      countQueryParams.anoLectivo = anoLectivo;
    }

    if (codigoFatura) {
      whereConditions.push(`f.Codigo = :codigoFatura`);
      dataQueryParams.codigoFatura = codigoFatura;
      countQueryParams.codigoFatura = codigoFatura;
    }

    if (codigoMatricula) {
      whereConditions.push(`f.CodigoMatricula = :codigoMatricula`);
      dataQueryParams.codigoMatricula = codigoMatricula;
      countQueryParams.codigoMatricula = codigoMatricula;
    }

    if (reference) {
      whereConditions.push(`f.Referencia = :reference`);
      dataQueryParams.reference = reference;
      countQueryParams.reference = reference;
    }

    const whereClause =
      whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

    // ===== QUERY DADOS =====
    const dataSql = `
SELECT *
FROM (
    SELECT
        f.Codigo                          AS codigo,
        f.DataFactura                     AS data_factura,
        f.TotalPreco                      AS total_preco,
        f.CodigoMatricula                 AS codigo_matricula,
        f.Referencia                      AS referencia,
        f.Descricao                       AS descricao,
        f.estado                          AS estado,
        f.valorapagar                     AS valor_pagar,
        f.totalmulta                      AS total_multa,
        f.desconto                        AS desconto,
        f.totaliva                        AS total_iva,
        f.TOTAL_INCIDENCIA                AS total_incidencia,

        -- Nome do aluno (melhor forma)
        COALESCE(p1.Nome_Completo, p2.Nome_Completo) AS nome_aluno,

        c.designacao                      AS curso,
        po.designacao                     AS polo,
        ano.Designacao                    AS ano_lectivo,
        ano.codigo                        AS codigo_ano_lectivo,

        LISTAGG(ts.Descricao, ' • ') WITHIN GROUP (ORDER BY ts.Descricao) AS servicos,
        LISTAGG(TO_CHAR(ts.Codigo), ', ') WITHIN GROUP (ORDER BY ts.Codigo) AS codigos_servicos,
        COUNT(fi.Codigo)                  AS qtd_itens,

        ROW_NUMBER() OVER (ORDER BY f.Codigo DESC) AS rn
    FROM FK2_FACTURA f
    LEFT JOIN FK2_TB_MATRICULAS       m   ON m.Codigo = f.CodigoMatricula
    LEFT JOIN FK2_TB_ADMISSAO         a   ON a.codigo = m.Codigo_Aluno
    LEFT JOIN FK2_TB_PREINSCRICAO     p1  ON p1.Codigo = a.pre_incricao

    -- Join direto com pré-inscrição
    LEFT JOIN FK2_TB_PREINSCRICAO     p2  ON p2.Codigo = f.codigo_preinscricao   -- <<<< muda o nome da coluna se for diferente

    LEFT JOIN FK2_TB_CURSOS           c   ON c.codigo = m.Codigo_Curso
    LEFT JOIN FK2_POLOS               po  ON po.id = f.polo_id
    LEFT JOIN FK2_TB_ANO_LECTIVO      ano ON ano.Codigo = f.ano_lectivo

    LEFT JOIN FK2_FACTURA_ITEMS       fi  ON fi.CodigoFactura = f.Codigo
    LEFT JOIN FK2_TB_TIPO_SERVICOS    ts  ON ts.Codigo = fi.CodigoProduto

    WHERE 1=1
    ${whereClause}

    GROUP BY
        f.Codigo, f.DataFactura, f.TotalPreco, f.valorapagar, f.totalmulta,
        f.totaliva, f.TOTAL_INCIDENCIA, f.CodigoMatricula, f.Referencia,
        f.Descricao, f.estado, f.desconto,
        p1.Nome_Completo, p2.Nome_Completo,   -- <<<< importante
        c.designacao, po.designacao, ano.Designacao, ano.codigo
) t
WHERE rn BETWEEN :startRow AND :endRow
  `;

    const rawResults = await this.dataSource.query(dataSql, dataQueryParams);

    // ===== QUERY TOTAL =====
    const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_FACTURA f
    LEFT JOIN FK2_TB_MATRICULAS m ON m.Codigo = f.CodigoMatricula
    LEFT JOIN FK2_TB_ADMISSAO a ON a.codigo = m.Codigo_Aluno
    LEFT JOIN FK2_TB_PREINSCRICAO p ON p.Codigo = a.pre_incricao
    LEFT JOIN FK2_TB_CURSOS c ON c.codigo = m.Codigo_Curso
    LEFT JOIN FK2_POLOS po ON po.id = f.polo_id
    WHERE 1=1
    ${whereClause}
  `;

    const totalResult = await this.dataSource.query(countSql, countQueryParams);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rawResults),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findInvoiceItens(invoiceId: number) {
    const sql = `
    SELECT
      fi.Codigo                AS codigoItem,
      fi.CodigoFactura         AS codigoFactura,
      fi.CodigoProduto         AS codigoProduto,
      fi.quantidade,
      fi.obs,
      fi.PRECO,
      fi.TOTAL,
      fi.multa  AS multa,

      ts.Descricao             AS descricaoServico,
      ts.Codigo                AS codigoServico,

      mt.id                    AS mesId,
      mt.DESIGNACAO             AS mesDescricao,
      mt.PRESTACAO              As prestacao

    FROM FK2_FACTURA_ITEMS fi

    LEFT JOIN FK2_TB_TIPO_SERVICOS ts
           ON ts.Codigo = fi.CodigoProduto

    LEFT JOIN FK2_MES_TEMP mt
           ON mt.id = fi.mes_temp_id

    WHERE fi.CodigoFactura = :invoiceId
  `;

    const params = [invoiceId];

    const results = await this.dataSource.query(sql, params);

    return toLowerCaseKeys(results);
  }

  async findAllTypeInvoiceDocument(): Promise<TypeInvoiceDocument[]> {
    return this.typeInvoiceDocumentRepository.find();
  }

  async findByEnrollmentCode(
    filterQuery: InvoiceFilterEnrollmentDto,
  ): Promise<PagedResult<any>> {
    const {
      limit = 10,
      page = 1,
      codigoMatricula,
      academicYear,
      codigoPreInscricao,
      status,
    } = filterQuery;

    if (!academicYear) {
      throw new BadRequestException('Ano letivo são obrigatórios.');
    }
    if (!codigoMatricula && !codigoPreInscricao) {
      throw new BadRequestException(
        'Necessária informar o codigoMatricula ou codigoPreInscricao',
      );
    }

    // Oracle pagination (ROW_NUMBER)
    const startRow = (page - 1) * limit + 1;
    const endRow = page * limit;

    /* ============================
       QUERY PAGINADA (DADOS)
       ============================ */
    const dataSql = `
  SELECT *
  FROM (
      SELECT
          -- ================= FACTURA =================
          f.Codigo                     AS f_codigo,
          f.DataFactura                AS f_data_factura,
          f.TotalPreco                 AS f_total_preco,
          TO_NUMBER(f.CodigoMatricula) AS f_codigo_matricula,
          f.Referencia                 AS f_referencia,
          f.Desconto                   AS f_desconto,
          f.Troco                      AS f_troco,
          f.totalIVA                   AS f_total_iva,
          f.TotalMulta                 AS f_total_multa,
          f.total_incidencia           AS f_total_incidencia,
          f.total_retencao             AS f_total_retencao,
          f.ValorAPagar                AS f_valor_a_pagar,
          f.ValorEntregue              AS f_valor_entregue,
          f.ValorAPagarExtenso         AS f_valor_a_pagar_extenso,
          f.Descricao                  AS f_descricao,
          f.NextFactura                AS f_next_factura,
          f.next                       AS f_next,
          f.texto_hash                 AS f_texto_hash,
          f.dataVencimento             AS f_data_vencimento,
          f.polo_id                    AS f_polo_id,
          f.hashValor                  AS f_hash_valor,
          f.canal                      AS f_canal,
          NVL(TO_CHAR(f.estado), '0')  AS f_estado,
          f.numSequenciaFactura        AS f_num_sequencia_factura,
          f.tipo_documento_factura_id  AS f_tipo_documento_factura_id,

          -- ================= ALUNO =================
          p.Nome_Completo              AS nome_completo_aluno,
          p.Bilhete_Identidade         AS bi_aluno,
          p.Email                      AS email_aluno,
          p.Contactos_Telefonicos      AS contactos_telefonicos,
          p.Data_Nascimento            AS data_nascimento,

          -- ================= FACTURA ITEMS =================
          fi.codigo                    AS fi_codigo,
          fi.CodigoFactura             AS fi_codigo_factura,
          fi.taxa_iva                  AS fi_taxa_iva,
          fi.valor_pago                AS fi_valor_pago,
          fi.valor_iva                 AS fi_valor_iva,
          fi.CodigoProduto             AS fi_codigo_produto,
          fi.Quantidade                AS fi_quantidade,
          fi.Total                     AS fi_total,
          fi.OBS                       AS fi_obs,
          fi.Mes                       AS fi_mes,
          fi.Multa                     AS fi_multa,
          fi.preco                     AS fi_preco,
          fi.estado                    AS fi_estado,

          -- ================= SERVIÇOS / MESES =================
          ts.Descricao                 AS ts_descricao,
          mt.designacao                AS mes_designacao,

          -- ================= PAGAMENTO POR REFERÊNCIA =================
          ppr.id                       AS ppr_id,
          ppr."REFERENCE"              AS ppr_reference,
          ppr."AMOUNT"                 AS ppr_amount,
          ppr."STATUS_"                AS ppr_status,
          ppr."START_DATE"             AS ppr_start_date,
          ppr."END_DATE"               AS ppr_end_date,
          ppr."ENTITY_ID"              AS ppr_entidade,

          -- ================= ANO LECTIVO / POLO =================
          ano.Designacao               AS ano_ano_lectivo,
          po.designacao                AS po_polo,

          -- ================= PAGINAÇÃO =================
          ROW_NUMBER() OVER (
              ORDER BY f.Codigo DESC, fi.codigo ASC, ppr.id ASC
          ) AS rn

      FROM FK2_FACTURA f

      LEFT JOIN FK2_FACTURA_ITEMS fi
             ON fi.CodigoFactura = f.Codigo

      LEFT JOIN FK2_TB_TIPO_SERVICOS ts
             ON ts.Codigo = fi.CodigoProduto

      LEFT JOIN FK2_MES_TEMP mt
             ON mt.id = fi.mes_temp_id

      LEFT JOIN FK2_TB_MATRICULAS m
             ON m.Codigo = f.CodigoMatricula

      LEFT JOIN FK2_TB_ADMISSAO a
             ON a.codigo = m.Codigo_Aluno

      LEFT JOIN FK2_TB_PREINSCRICAO p
             ON p.Codigo = a.pre_incricao

      LEFT JOIN FK2_PAGAMENTO_POR_REFERENCIAS ppr
             ON ppr.factura_codigo = f.Codigo

      LEFT JOIN FK2_TB_ANO_LECTIVO ano
             ON ano.Codigo = f.ano_lectivo

      LEFT JOIN FK2_POLOS po
             ON po.id = f.polo_id

      WHERE 1=1

          AND(:codigoMatricula IS NULL or  f.CodigoMatricula = :codigoMatricula )
          AND (:codigoPreInscricao IS NULL or f.codigo_preinscricao	 = :codigoPreInscricao)
          AND f.ano_lectivo = :academicYear
          AND f.estado <> 3
          AND (:status IS NULL OR f.estado = :status)
  )
  WHERE rn BETWEEN :startRow AND :endRow
  `;

    const rawResults = await this.dataSource.query(dataSql, {
      codigoMatricula: codigoMatricula ?? null,
      academicYear,
      status: status ?? null,
      startRow,
      codigoPreInscricao: codigoPreInscricao ?? null,
      endRow,
    } as any);

    /* ============================
       QUERY TOTAL (COUNT CORRETO)
       ============================ */
    const countSql = `
    SELECT COUNT(DISTINCT f.Codigo) AS TOTAL
    FROM FK2_FACTURA f
    LEFT JOIN FK2_FACTURA_ITEMS fi
           ON fi.CodigoFactura = f.Codigo
    LEFT JOIN FK2_PAGAMENTO_POR_REFERENCIAS ppr
           ON ppr.factura_codigo = f.Codigo
    WHERE
        f.CodigoMatricula = :codigoMatricula
        AND f.ano_lectivo = :academicYear
        AND f.estado <> 3
        AND (:status IS NULL OR f.estado = :status)
  `;

    const totalResult = await this.dataSource.query(countSql, {
      codigoMatricula,
      academicYear,
      status: status ?? null,
    } as any);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    const groupedInvoices = groupInvoices(rawResults);

    return {
      data: groupedInvoices,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retorna uma única fatura pelo seu código (chave primária).
   * @param Codigo O Código (ID) da fatura.
   * @returns A fatura correspondente.
   * @throws NotFoundException Se a fatura não for encontrada.
   */
  async findOne(Codigo: any): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { Codigo } });
    if (!invoice) {
      throw new NotFoundException(
        `Fatura com Código ${Codigo} não encontrada.`,
      );
    }
    return invoice;
  }

  /**
   * Atualiza uma fatura existente.
   * @param Codigo O Código (ID) da fatura a ser atualizada.
   * @param updateInvoiceDto Os dados a serem atualizados.
   * @returns A fatura atualizada.
   * @throws NotFoundException Se a fatura não for encontrada.
   */
  async update(
    Codigo: number,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    // Verifica se a fatura existe
    await this.findOne(Codigo);

    // O .update() retorna um UpdateResult, "por" isso, "buscamos" a entidade atualizada
    await this.invoiceRepository.update(Codigo, updateInvoiceDto);

    return this.findOne(Codigo); // Retorna a fatura atualizada
  }
  async updateEntity(invoice: Invoice) {
    return this.invoiceRepository.save(invoice);
  }

  async updateStatusByReference(
    reference: string,
    status: number,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { Referencia: reference },
    });
    if (!invoice) {
      throw new NotFoundException(
        `Fatura com referência ${reference} não encontrada.`,
      );
    }

    invoice.estado = status;
    return this.invoiceRepository.save(invoice);
  }
  async updateReferenceNumber(
    invoiceId: any,
    referenceNumber: string,
    dueDate: any,
    newAmount: number,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { Codigo: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Fatura com ID ${invoiceId} não encontrada.`);
    }

    invoice.Referencia = referenceNumber;
    invoice.dataVencimento = dueDate;
    invoice.TotalPreco = newAmount;
    return this.invoiceRepository.save(invoice);
  }
  async findByReference(reference: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({ where: { Referencia: reference } });
  }

  async queueCreateInvoice(
    createInvoiceDto: CreateInvoiceDto,
    referenceParams?: string,
    dueDateParams?: string,
  ): Promise<{ message: string; taskId: string | undefined }> {
    const job = await this.invoiceQueue.add(
      'createInvoiceJob',
      {
        createInvoiceDto,
        referenceParams,
        dueDateParams,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: 5000,
      },
    );
    return {
      message: 'Processamento iniciado: criando faturas ...',
      taskId: job.id,
    };
  }
}
function groupInvoices(rows: any[]): any[] {
  const invoiceMap = new Map<number, any>();

  for (const row of rows) {
    const codigo = row.F_CODIGO;
    if (!codigo) continue;

    /* ========================
       FACTURA (HEADER)
       ======================== */
    if (!invoiceMap.has(codigo)) {
      invoiceMap.set(codigo, {
        Codigo: codigo,
        DataFactura: row.F_DATA_FACTURA,
        TotalPreco: row.F_TOTAL_PRECO,
        CodigoMatricula: row.F_CODIGO_MATRICULA,
        Referencia: row.F_REFERENCIA,
        Desconto: row.F_DESCONTO,
        Troco: row.F_TROCO,
        totalIVA: row.F_TOTAL_IVA,
        TotalMulta: row.F_TOTAL_MULTA,
        total_incidencia: row.F_TOTAL_INCIDENCIA,
        total_retencao: row.F_TOTAL_RETENCAO,
        ValorAPagar: row.F_VALOR_A_PAGAR,
        ValorEntregue: row.F_VALOR_ENTREGUE,
        ValorAPagarExtenso: row.F_VALOR_A_PAGAR_EXTENSO,
        Descricao: row.F_DESCRICAO,
        NextFactura: row.F_NEXT_FACTURA,
        next: row.F_NEXT,
        texto_hash: row.F_TEXTO_HASH,
        dataVencimento: row.F_DATA_VENCIMENTO,
        polo_id: row.F_POLO_ID,
        polo: row.PO_POLO,
        hashValor: row.F_HASH_VALOR,
        canal: row.F_CANAL,
        estado: Number(row.F_ESTADO),
        numSequenciaFactura: row.F_NUM_SEQUENCIA_FACTURA,
        tipo_documento_factura_id: row.F_TIPO_DOCUMENTO_FACTURA_ID,
        ano_lectivo: row.ANO_ANO_LECTIVO,

        // ================= ALUNO =================

        NomeCompleto: row.NOME_COMPLETO_ALUNO,
        BI: row.BI_ALUNO,
        Email: row.EMAIL_ALUNO,
        Contactos: row.CONTACTOS_TELEFONICOS,
        DataNascimento: row.DATA_NASCIMENTO,

        // ================= LISTAS =================
        itens: [],
        referencias_pagamento: [],
      });
    }

    const invoice = invoiceMap.get(codigo);

    /* ========================
       ITENS DA FACTURA
       ======================== */
    if (row.FI_CODIGO && row.FI_CODIGO_FACTURA === codigo) {
      const itemExists = invoice.itens.some(
        (i: any) => i.codigo === row.FI_CODIGO,
      );

      if (!itemExists) {
        invoice.itens.push({
          codigo: row.FI_CODIGO,
          CodigoFactura: row.FI_CODIGO_FACTURA,
          CodigoProduto: row.FI_CODIGO_PRODUTO,
          Quantidade: row.FI_QUANTIDADE,
          Total: row.FI_TOTAL,
          preco: row.FI_PRECO,
          OBS: row.FI_OBS,
          Mes: row.FI_MES,
          Multa: row.FI_MULTA,
          taxa_iva: row.FI_TAXA_IVA,
          valor_iva: row.FI_VALOR_IVA,
          valor_pago: row.FI_VALOR_PAGO,
          DescricaoServico: row.TS_DESCRICAO,
          MesDesignacao: row.MES_DESIGNACAO,
          estado: row.FI_ESTADO,
        });
      }
    }

    /* ========================
       REFERÊNCIAS DE PAGAMENTO
       ======================== */
    if (row.PPR_ID) {
      const refExists = invoice.referencias_pagamento.some(
        (r: any) => r.id === row.PPR_ID,
      );

      if (!refExists) {
        invoice.referencias_pagamento.push({
          id: row.PPR_ID,
          REFERENCE: row.PPR_REFERENCE,
          AMOUNT: row.PPR_AMOUNT,
          Status: row.PPR_STATUS,
          START_DATE: row.PPR_START_DATE,
          END_DATE: row.PPR_END_DATE,
          ENTITY_ID: row.PPR_ENTIDADE,
        });
      }
    }
  }

  return Array.from(invoiceMap.values());
}

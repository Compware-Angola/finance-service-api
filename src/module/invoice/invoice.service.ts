import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, IsNull, Repository } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { InvoiceFilterEnrollmentDto } from './dto/Invoice-filter-enrollment-code.dto';

import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { AcademicYear } from './entities/academic.year.entity';
import { genearateKeyNumber } from '../util/generate-key-number';
import { generateDueDate } from '../util/generate-due-date';
import { InvoiceItem } from './entities/InvoiceIten.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

//0 - pendente,
//1 - validado
//2 - parcelarmente pago
//3 - eliminado
@Injectable()
export class InvoiceService {
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
  ) { Invoice.setRepository(this.invoiceRepository); InvoiceItem.setRepository(this.invoiceItemRepository) }
  /**
   * Cria e salva uma nova fatura no banco de dados, "incluindo" a geração de hash e sequenciamento.
   * @param createInvoiceDto Dados da nova fatura.
   * @returns A fatura criada.
   */

  async create(
    createInvoiceDto: CreateInvoiceDto,
    referenceParams?: string,
    dueDateParams?: string,
    // 🔥 Manager opcional → permite transação externa (ex: createMonthlyPaymentReferences)
    transactionalEntityManager?: EntityManager,
  ): Promise<Invoice> {

    // Se não vier manager, "cria" uma transação interna (compatibilidade total)
    const manager = transactionalEntityManager || this.invoiceRepository.manager;

    return await manager.transaction(async (em) => {
      const { itens, ...invoiceData } = createInvoiceDto;
      // 1. GERAR CÓDIGO SEQUENCIAL
      const lastInvoice = await em
        .createQueryBuilder(Invoice, 'i')
        .select('i.Codigo', 'i_Codigo')
        .where("REGEXP_LIKE(i.Codigo, '^[0-9]+$')")
        .orderBy('TO_NUMBER(i.Codigo)', 'DESC')
        .limit(1)
        .getRawOne();

      let nextNumber = 1;
      if (lastInvoice?.i_Codigo) {
        const lastNum = Number(lastInvoice.i_Codigo);
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }

      const codigoGerado = nextNumber;


      // 🔹 Referência (usa parâmetro ou gera nova)
      const referencia: string =
        referenceParams || (await genearateKeyNumber(9));

      // 🔹 Data de vencimento (aceita string ou Date)
      const dueDate: string =
        dueDateParams || (await generateDueDate(10));

      // 1. Tipo de documento
      const tipoDocumentoId = createInvoiceDto.tipo_documento_factura_id || 2;
      const document = await em.findOne(this.typeInvoiceDocumentRepository.target, {
        where: { id: tipoDocumentoId },
      });
      if (!document) {
        throw new NotFoundException('Tipo de documento inválido.');
      }
      const tipoDocumentoSigla = document.sigla;

      // 2. Ano letivo ativo
      const academicYear = await em.findOne(this.academicYearRepository.target, {
        where: { estado: 'Activo' },
      });
      if (!academicYear) {
        throw new NotFoundException('Ano letivo não definido no sistema.');
      }
      const anoLetivoDesignacao = academicYear.Designacao;
      const anoLetivoId = academicYear.Codigo;

      // 3. Polo
      const poloId = createInvoiceDto.polo_id || 1;

      // 4. Gerar hash + numeração (usando o mesmo manager para consistência)
      const hashData = await this.hashService.generateInvoiceHashData(
        createInvoiceDto.TotalPreco,
        tipoDocumentoId,
        anoLetivoId,
        poloId,
        tipoDocumentoSigla,
        anoLetivoDesignacao,

      );

      const invoiceToCreate = em.create(
        this.invoiceRepository.target,
        {
          Codigo: codigoGerado,
          DataFactura: new Date(),
          TotalPreco: invoiceData.TotalPreco,
          CodigoMatricula: invoiceData.CodigoMatricula!,
          Referencia: referencia,
          Desconto: invoiceData.Desconto ?? 0,
          totalIVA: invoiceData.totalIVA ?? 0,
          TotalMulta: invoiceData.TotalMulta ?? 0,
          ValorAPagar: invoiceData.ValorAPagar ?? invoiceData.TotalPreco,
          Descricao: invoiceData.Descricao ?? 'Pagamento de Mensalidade',
          codigoDescricao: invoiceData.codigo_descricao ?? 101,
          NextFactura: hashData.numeracaoFactura,
          next: hashData.numeracaoFactura,
          textoHash: hashData.plaintext,
          //hashValor: hashData.hashValor, reduzi porque nao aceita todo ele
          hashValor: hashData.hashValor.slice(0, 255),
          dataVencimento: dueDate,
          poloId: invoiceData.polo_id,
          canal: invoiceData.canal ?? 3,
          anoLectivo: anoLetivoId,
          estado: 0,
          numSequenciaFactura: hashData.numSequenciaFactura,
          tipoDocumentoFacturaId: tipoDocumentoId,
          Troco: 0,
          ValorEntregue: 0,
          ValorAPagarExtenso: '',
          obs: '',
          contaCorrente: '',
          corrente: 0,
          codigoPreinscricao: invoiceData.codigo_preinscricao ?? null,
          totalIncidencia: invoiceData.total_incidencia ?? null,
          totalRetencao: invoiceData.total_retencao ?? null,
          ValorEntregueMltCX: 0,
          faturaReference: '',
        } as DeepPartial<Invoice>,
      );


      const savedInvoice = await em.save(invoiceToCreate);

      // 6. Itens da fatura (se existirem)
      if (itens?.length) {
        const invoiceItems: InvoiceItem[] = [];

        // 1. Buscar o último código usado (uma vez)
        const ultimoItem = await em
          .createQueryBuilder(InvoiceItem, 'i')
          .select('i.codigo', 'i_codigo')
          .where("REGEXP_LIKE(i.codigo, '^[0-9]+$')")
          .orderBy('TO_NUMBER(i.codigo)', 'DESC')
          .limit(1)
          .getRawOne();

        let ultimoNumero = 0;
        if (ultimoItem?.i_codigo) {
          ultimoNumero = Number(ultimoItem.i_codigo);
        }

        // 2. Gerar códigos sequenciais para cada item
        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          ultimoNumero += 1; // Incrementa a cada item
          const codigoGerado = ultimoNumero;
          console.log(`CÓDIGO GERADO PARA ITEM ${i + 1}:`, codigoGerado);

          const invoiceItem = em.create(this.invoiceItemRepository.target, {
            codigo: codigoGerado,
            CodigoProduto: item.CodigoProduto,
            CodigoFactura: savedInvoice.Codigo,
            quantidade: item.Quantidade ?? 1, // default 1 se não enviar
            total: item.Total ?? 0,
            obs: (item.obs ?? `Item fatura ${savedInvoice.Codigo}`).substring(0, 45),
            taxaIva: item.taxaIva ?? 0,
            valorIva: item.valorIva ?? 0,
            preco: item.preco ?? 0,
            retencao: item.retencao ?? 0,
            incidencia: item.incidencia ?? 0,
            valorDesconto: item.valorDesconto ?? 0,
            descontoProduto: item.descontoProduto ?? 0,
            mes: item.mes ?? null,          // null se não enviado
            multa: item.multa ?? 0,
            mesTempId: item.mesTempId ?? null, // null evita DEFAULT
            codigoAnoLectivo: savedInvoice.anoLectivo,
            estado: item.estado ?? 0,
            valorPago: item.valorPago ?? 0,
            valorATransportar: item.valorATransportar?.toString() ?? null,
          } as DeepPartial<InvoiceItem>,);


          invoiceItems.push(invoiceItem);
        }

        // 3. Salvar todos os itens de uma vez
        await em.save(invoiceItems);
      }

      return savedInvoice;
    });
  }
  /**
     * Retorna todas as faturas com paginação.
     * @param paginationQuery O DTO com os parâmetros de paginação (page e limit).
     * @returns Um objeto contendo a lista de faturas, total e informações de paginação.
     */
  async findAll(paginationQuery: PaginationQueryDto): Promise<PagedResult<Invoice>> {
    const { limit = 10, page = 1 } = paginationQuery;

    // Calcula o 'offset' (quantos itens pular)
    const skip = (page - 1) * limit;

    // TypeORM's findAndCount: [results, totalCount]
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      take: limit, // Corresponde ao LIMIT no SQL
      skip: skip, // Corresponde ao OFFSET no SQL
      order: { Codigo: 'DESC' }, // Boa prática: ordenar por PK ou data
      // Você pode adicionar 'where' aqui se precisar de filtragem
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findAllTypeInvoiceDocument(): Promise<TypeInvoiceDocument[]> {
    return this.typeInvoiceDocumentRepository.find();
  }


async findByEnrollmentCode(
  filterQuery: InvoiceFilterEnrollmentDto
): Promise<PagedResult<any>> {

  const {
    limit = 10,
    page = 1,
    codigoMatricula,
    academicYear,
    status,
  } = filterQuery;

  if (!codigoMatricula || !academicYear) {
    throw new BadRequestException(
      'Código da matrícula e ano letivo são obrigatórios.'
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
        f.Codigo                    AS f_codigo,
        f.DataFactura               AS f_data_factura,
        f.TotalPreco                AS f_total_preco,
        TO_NUMBER(f.CodigoMatricula) AS f_codigo_matricula,
        f.Referencia                AS f_referencia,
        f.Desconto                  AS f_desconto,
        f.Troco                     AS f_troco,
        f.totalIVA                  AS f_total_iva,
        f.TotalMulta                AS f_total_multa,
        f.total_incidencia          AS f_total_incidencia,
        f.total_retencao            AS f_total_retencao,
        f.ValorAPagar               AS f_valor_a_pagar,
        f.ValorEntregue             AS f_valor_entregue,
        f.ValorAPagarExtenso        AS f_valor_a_pagar_extenso,
        f.Descricao                 AS f_descricao,
        f.NextFactura               AS f_next_factura,
        f.next                      AS f_next,
        f.texto_hash                AS f_texto_hash,
        f.dataVencimento            AS f_data_vencimento,
        f.polo_id                   AS f_polo_id,
        f.hashValor                 AS f_hash_valor,
        f.canal                     AS f_canal,
        NVL(TO_CHAR(f.estado), '0') AS f_estado,
        f.numSequenciaFactura       AS f_num_sequencia_factura,
        f.tipo_documento_factura_id AS f_tipo_documento_factura_id,

        -- ================= ALUNO =================
        p.Nome_Completo             AS nome_completo_aluno,
        p.Bilhete_Identidade        AS bi_aluno,
        p.Email                     AS email_aluno,
        p.Contactos_Telefonicos     AS contactos_telefonicos,
        p.Data_Nascimento           AS data_nascimento,

        -- ================= FACTURA ITEMS =================
        fi.codigo                   AS fi_codigo,
        fi.CodigoFactura            AS fi_CodigoFactura,
        fi.taxa_iva                 AS fi_taxa_iva,
        fi.valor_pago               AS fi_valor_pago,
        fi.valor_iva                AS fi_valor_iva,
        fi.CodigoProduto            AS fi_codigo_produto,
        fi.Quantidade               AS fi_quantidade,
        fi.Total                    AS fi_total,
        fi.OBS                      AS fi_obs,
        fi.Mes                      AS fi_mes,
        fi.Multa                    AS fi_multa,
        fi.preco                    AS fi_preco,

        -- ================= SERVIÇOS / MESES =================
        ts.Descricao                AS ts_descricao,
        mt.designacao               AS mes_designacao,

        -- ================= PAGAMENTO POR REFERÊNCIA =================
        ppr.id                      AS ppr_id,
        ppr."REFERENCE"             AS ppr_reference,
        ppr."AMOUNT"                AS ppr_amount,
        ppr."STATUS_"                AS ppr_status,
        ppr."START_DATE"            AS ppr_start_date,
        ppr."END_DATE"              AS ppr_end_date,
        ppr."ENTITY_ID"             AS ppr_entidade,

        -- ================= ANO LECTIVO / POLO =================
        ano.Designacao              AS ano_ano_lectivo,
        po.designacao               AS po_polo,

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

    WHERE
        f.CodigoMatricula = :codigoMatricula
        AND f.ano_lectivo = :academicYear
        AND f.estado <> 3
        AND (:status IS NULL OR f.estado = :status)
)
WHERE rn BETWEEN :startRow AND :endRow

  `;

  const rawResults = await this.dataSource.query(dataSql, {
    codigoMatricula,
    academicYear,
    status: status ?? null,
    startRow,
    endRow,
  } as any);

  /* ============================
     QUERY TOTAL (COUNT)
     ============================ */
  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_FACTURA
    WHERE
        CodigoMatricula = :codigoMatricula
        AND ano_lectivo = :academicYear
        AND estado <> 3
        AND (:status IS NULL OR estado = :status)
  `;

  const totalResult = await this.dataSource.query(countSql, {
    codigoMatricula,
    academicYear,
    status: status ?? null,
  } as any);

  const total = Number(totalResult[0]?.TOTAL ?? 0);
  const totalPages = Math.ceil(total / limit);

  // Mantém a tua lógica atual

  console.log(rawResults);
  
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
      throw new NotFoundException(`Fatura com Código ${Codigo} não encontrada.`);
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
  async update(Codigo: number, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    // Verifica se a fatura existe
    await this.findOne(Codigo);

    // O .update() retorna um UpdateResult, "por" isso, "buscamos" a entidade atualizada
    await this.invoiceRepository.update(Codigo, updateInvoiceDto);

    return this.findOne(Codigo); // Retorna a fatura atualizada
  }
  async updateEntity(invoice: Invoice) {
    return this.invoiceRepository.save(invoice);
  }

  async updateStatusByReference(reference: string, status: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { Referencia: reference } });
    if (!invoice) {
      throw new NotFoundException(`Fatura com referência ${reference} não encontrada.`);
    }

    invoice.estado = status;
    return this.invoiceRepository.save(invoice);
  }
  async updateReferenceNumber(invoiceId: any,
    referenceNumber: string,
    dueDate: any, newAmount: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { Codigo: invoiceId } });
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

  async queueCreateInvoice(createInvoiceDto: CreateInvoiceDto, referenceParams?: string,
    dueDateParams?: string): Promise<{ message: string; taskId: string | undefined }> {


    const job = await this.invoiceQueue.add('createInvoiceJob', {
      createInvoiceDto,
      referenceParams,
      dueDateParams
    }, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: 5000,
    });
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
    if (row.FI_CODIGO && row.FI_CODIGOFACTURA === codigo) {
      const itemExists = invoice.itens.some(
        (i: any) => i.codigo === row.FI_CODIGO
      );

      if (!itemExists) {
        invoice.itens.push({
          codigo: row.FI_CODIGO,
          CodigoFactura: row.FI_CODIGOFACTURA,
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
        });
      }
    }

    /* ========================
       REFERÊNCIAS DE PAGAMENTO
       ======================== */
    if (row.PPR_ID) {
      const refExists = invoice.referencias_pagamento.some(
        (r: any) => r.id === row.PPR_ID
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

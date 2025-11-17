import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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
  ) {Invoice.setRepository(this.invoiceRepository);InvoiceItem.setRepository(this.invoiceItemRepository) }
  /**
   * Cria e salva uma nova fatura no banco de dados, "incluindo" a geração de hash e sequenciamento.
   * @param createInvoiceDto Dados da nova fatura.
   * @returns A fatura criada.
   */

async create(
  createInvoiceDto: CreateInvoiceDto,
  referenceParams?: string,
  dueDateParams?: string ,
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

    const codigoGerado = nextNumber.toString();
    console.log('CÓDIGO GERADO PARA FATURA:', codigoGerado);

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

    // 5. Criar entidade Invoice
    const invoiceToCreate = em.create(this.invoiceRepository.target, {
      ...invoiceData,
      Codigo: codigoGerado,
      DataFactura: new Date(),
      poloId,
      numSequenciaFactura: hashData.numSequenciaFactura,
      NextFactura: hashData.numeracaoFactura,
      next: hashData.numeracaoFactura,
      Referencia: referencia,
      hashValor: hashData.hashValor,
      textoHash: hashData.plaintext,
      dataVencimento: dueDate,
      tipoDocumentoFacturaId: tipoDocumentoId,
      anoLectivo: anoLetivoId,
    });

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
    const codigoGerado = ultimoNumero.toString().padStart(6, '0');
    console.log(`CÓDIGO GERADO PARA ITEM ${i + 1}:`, codigoGerado);

    const invoiceItem = em.create(this.invoiceItemRepository.target, {
      codigo: codigoGerado, // ← AQUI!
      CodigoProduto: item.CodigoProduto.toString(),
      CodigoFactura: savedInvoice.Codigo,
      quantidade: item.Quantidade,
      total: item.Total,
      obs: item.obs || `Item fatura ${savedInvoice.Codigo}`,
      taxaIva: item.taxaIva,
      valorIva: item.valorIva,
      preco: item.preco,
      retencao: item.retencao,
      incidencia: item.incidencia,
      valorDesconto: item.valorDesconto,
      descontoProduto: item.descontoProduto,
      mes: item.mes,
      multa: item.multa,
      mesTempId: item.mesTempId,
      codigoAnoLectivo: savedInvoice.anoLectivo,
      estado: item.estado ?? 0,
      valorPago: item.valorPago ?? 0,
      valorATransportar: item.valorATransportar?.toString() ?? '0',
    });

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


async findByEnrollmentCode(filterQuery: InvoiceFilterEnrollmentDto): Promise<PagedResult<any>> {
  const { limit = 10, page = 1, codigoMatricula, academicYear } = filterQuery;

  if (isNaN(codigoMatricula) || isNaN(academicYear)) {
    throw new BadRequestException('Parâmetros inválidos.');
  }

  const skip = (page - 1) * limit;

  // 1. CONTAGEM SEGURA
  const totalResult = await this.invoiceRepository
    .createQueryBuilder('f')
    .where('REGEXP_LIKE(TRIM(f.CodigoMatricula), \'^[0-9]+$\')')
    .andWhere('REGEXP_LIKE(TRIM(f.ano_lectivo), \'^[0-9]+$\')')
    .andWhere('NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) = :codigoMatricula', { codigoMatricula })
    .andWhere('NVL(TO_NUMBER(TRIM(f.ano_lectivo)), 0) = :academicYear', { academicYear })
    .andWhere('NVL(TO_CHAR(f.estado), \'0\') != :estado', { estado: '3' })
    .select('COUNT(*) AS "total"')
    .getRawOne();

  const total = Number(totalResult?.total || 0);
  const totalPages = Math.ceil(total / limit);

  console.log(totalResult);
  

  if (total === 0) {
    return { data: [], total, page, limit, totalPages };
  }
const dataQuery = this.invoiceRepository
  .createQueryBuilder('f')
  .select([
    '"f"."Codigo" AS "f_codigo"',
    '"f"."DataFactura" AS "f_data_factura"',
    '"f"."TotalPreco" AS "f_total_preco"',
    // Aqui pode manter o TO_NUMBER só no SELECT (é seguro agora)
    'TO_NUMBER("f"."CodigoMatricula") AS "f_codigo_matricula"',
    '"f"."Referencia" AS "f_referencia"',
    '"f"."Desconto" AS "f_desconto"',
    '"f"."Troco" AS "f_troco"',
    '"f"."totalIVA" AS "f_total_iva"',
    '"f"."TotalMulta" AS "f_total_multa"',
    '"f"."total_incidencia" AS "f_total_incidencia"',
    '"f"."total_retencao" AS "f_total_retencao"',
    '"f"."ValorAPagar" AS "f_valor_a_pagar"',
    '"f"."ValorEntregue" AS "f_valor_entregue"',
    '"f"."ValorAPagarExtenso" AS "f_valor_a_pagar_extenso"',
    '"f"."Descricao" AS "f_descricao"',
    '"f"."NextFactura" AS "f_next_factura"',
    '"f"."next" AS "f_next"',
    '"f"."texto_hash" AS "f_texto_hash"',
    '"f"."dataVencimento" AS "f_data_vencimento"',
    '"f"."polo_id" AS "f_polo_id"',
    '"f"."hashValor" AS "f_hash_valor"',
    '"f"."canal" AS "f_canal"',
    'TO_NUMBER("f"."ano_lectivo") AS "f_ano_lectivo"',
    'NVL(TO_CHAR("f"."estado"), \'0\') AS "f_estado"',
    '"f"."numSequenciaFactura" AS "f_num_sequencia_factura"',
    '"f"."tipo_documento_factura_id" AS "f_tipo_documento_factura_id"',
    '"p"."Nome_Completo" AS "nome_completo_aluno"',
    '"p"."Bilhete_Identidade" AS "bi_aluno"',
    '"p"."Email" AS "email_aluno"',
    '"p"."Contactos_Telefonicos" AS "contactos_telefonicos"',
    '"p"."Data_Nascimento" AS "data_nascimento"',
    '"fi"."codigo" AS "fi_codigo"',
    '"fi"."CodigoFactura" AS "fi_CodigoFactura"',
    '"fi"."CodigoProduto" AS "fi_codigo_produto"',
    '"fi"."Quantidade" AS "fi_quantidade"',
    '"fi"."Total" AS "fi_total"',
    '"fi"."OBS" AS "fi_obs"',
    '"fi"."Mes" AS "fi_mes"',
    '"fi"."Multa" AS "fi_multa"',
    '"ts"."Descricao" AS "ts_descricao"',
    '"mt"."designacao" AS "mes_designacao"',
    '"ppr"."id" AS "ppr_id"',
    '"ppr"."REFERENCE" AS "ppr_reference"',
    '"ppr"."AMOUNT" AS "ppr_amount"',
    '"ppr"."Status" AS "ppr_status"',
    '"ppr"."START_DATE" AS "ppr_start_date"',
    '"ppr"."END_DATE" AS "ppr_end_date"',
  ])
  .leftJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
  .leftJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'fi.CodigoProduto = ts.Codigo')
  .leftJoin('UMA_MES_TEMP', 'mt', 'fi.mes_temp_id = mt.id')
  .leftJoin('UMA_TB_MATRICULAS', 'm', '"m"."Codigo" = f.CodigoMatricula')         
  .leftJoin('UMA_TB_ADMISSAO', 'a', 'm.Codigo_Aluno = a.codigo')
  .leftJoin('UMA_TB_PREINSCRICAO', 'p', 'a.pre_incricao = p.Codigo')
  .leftJoin('UMA_PAGAMENTO_POR_REFERENCIAS', 'ppr', 'ppr.factura_codigo = f.Codigo AND ppr.Status != \'Expired\'')

  // FILTROS SIMPLES E RÁPIDOS (exatamente como você quer)
  .where('"f"."CodigoMatricula" = :codigoMatricula', { 
    codigoMatricula: codigoMatricula.toString() 
  })
  .andWhere('"f"."ano_lectivo" = :academicYear', { 
    academicYear: academicYear.toString() 
  })
  .andWhere('NVL(TO_CHAR("f"."estado"), \'0\') != \'3\'')

  .orderBy('"f"."Codigo"', 'DESC')
  .addOrderBy('"fi"."codigo"', 'ASC')
  .addOrderBy('"ppr"."id"', 'ASC')
// REMOVA O LIMIT AQUI SE QUISER TODAS AS FATURAS
  // .offset(skip)
  // .limit(limit)

  const rawResults = await dataQuery.getRawMany();

  const paginatedInvoices = groupInvoices(rawResults);

  return {
    data: paginatedInvoices,
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
  const invoiceMap = new Map<string, any>();

  rows.forEach(row => {
    const codigo = row.f_codigo;

    if (!invoiceMap.has(codigo)) {
      invoiceMap.set(codigo, {
        Codigo: codigo,
        DataFactura: row.f_data_factura,
        TotalPreco: row.f_total_preco,
        CodigoMatricula: row.f_codigo_matricula,
        Referencia: row.f_referencia,
        Desconto: row.f_desconto,
        Troco: row.f_troco,
        totalIVA: row.f_total_iva,
        TotalMulta: row.f_total_multa,
        total_incidencia: row.f_total_incidencia,
        total_retencao: row.f_total_retencao,
        ValorAPagar: row.f_valor_a_pagar,
        ValorEntregue: row.f_valor_entregue,
        ValorAPagarExtenso: row.f_valor_a_pagar_extenso,
        Descricao: row.f_descricao,
        NextFactura: row.f_next_factura,
        next: row.f_next,
        texto_hash: row.f_texto_hash,
        dataVencimento: row.f_data_vencimento,
        polo_id: row.f_polo_id,
        hashValor: row.f_hash_valor,
        canal: row.f_canal,
        ano_lectivo: row.f_ano_lectivo,
        estado: Number(row.f_estado),
        numSequenciaFactura: row.f_num_sequencia_factura,
        tipo_documento_factura_id: row.f_tipo_documento_factura_id,
        // DADOS DO ALUNO
        NomeCompletoAluno: row.nome_completo_aluno,
        BI_Aluno: row.bi_aluno,
        EmailAluno: row.email_aluno,
        Contactos_Telefonicos: row.contactos_telefonicos,
        Data_Nascimento: row.data_nascimento,
        // ITENS E PAGAMENTOS
        itens: [],
        referencias_pagamento: []
      });
    }

    const invoice = invoiceMap.get(codigo);
    console.log(row);
    

    // ADICIONAR ITEM somente se fi_CodigoFactura == f_codigo
    if (row.f_codigo != null && row.fi_CodigoFactura === row.f_codigo) {
      const itemKey = `${row.fi_mes}-${row.fi_codigo_produto}-${row.fi_codigo_ano_lectivo}`;
      const itemExists = invoice.itens.some((i: any) =>
        `${i.Mes}-${i.CodigoProduto}-${i.codigo_anoLectivo}` === itemKey
      );

      if (!itemExists) {
        invoice.itens.push({
          codigo: row.fi_codigo,
          CodigoProduto: row.fi_codigo_produto,
          CodigoFactura: row.fi_CodigoFactura,
          Quantidade: row.fi_quantidade,
          Total: row.fi_total,
          OBS: row.fi_obs,
          Mes: row.fi_mes,
          Multa: row.fi_multa,
          codigo_anoLectivo: row.fi_codigo_ano_lectivo,
          DescricaoServico: row.ts_descricao,
          MesDesignacao: row.mes_designacao
        });
      }
    }

    // ADICIONAR REFERÊNCIA DE PAGAMENTO
    if (row.ppr_id != null) {
      const refExists = invoice.referencias_pagamento.some((r: any) => r.id === row.ppr_id);
      if (!refExists) {
        invoice.referencias_pagamento.push({
          id: row.ppr_id,
          REFERENCE: row.ppr_reference,
          AMOUNT: row.ppr_amount,
          START_DATE: row.ppr_start_date,
          END_DATE: row.ppr_end_date,
          Status: row.ppr_status
        });
      }
    }
  });

  return Array.from(invoiceMap.values());
}

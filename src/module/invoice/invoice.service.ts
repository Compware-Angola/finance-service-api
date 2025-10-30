import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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


@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,

    @InjectRepository(TypeInvoiceDocument)
    private readonly typeInvoiceDocumentRepository: Repository<TypeInvoiceDocument>,
    @InjectRepository(AcademicYear)


    private readonly academicYearRepository: Repository<AcademicYear>,

    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly hashService: InvoiceNumberingAndHashService,
  ) { }
  /**
   * Cria e salva uma nova fatura no banco de dados, incluindo a geração de hash e sequenciamento.
   * @param createInvoiceDto Dados da nova fatura.
   * @returns A fatura criada.
   */
  async create(createInvoiceDto: CreateInvoiceDto, referenceParams?: string,
    dueDateParams?: string): Promise<Invoice> {
    const { itens, ...invoiceData } = createInvoiceDto;
    // 🔹 Se não vier "Referencia", gera automaticamente
    const referencia: string =
      referenceParams || (await genearateKeyNumber(9));

    // 🔹 Se não vier "dataVencimento", gera automaticamente
    const dueDate: string =
      dueDateParams || (await generateDueDate(10));
    // 1. Obter Tipo de Documento e Ano Letivo (Geralmente por ID)
    const tipoDocumentoId = createInvoiceDto.tipo_documento_factura_id || 2;

    // ⚠️ Busque o Tipo de Documento (ou injete um serviço que o faça)
    const document = await this.typeInvoiceDocumentRepository.findOne({ where: { id: tipoDocumentoId } });
    if (!document) { throw new NotFoundException('Tipo de documento inválido.'); }
    const tipoDocumentoSigla = document.sigla;
    const academicyear = await this.academicYearRepository.findOne({ where: { estado: 'Activo' } });
    if (!academicyear) { throw new NotFoundException('Ano letivo Não definido no sistema .'); }
    const anoLetivoDesignacao = academicyear.Designacao;
    // O ID do Polo/Condomínio vem do DTO
    const poloId = createInvoiceDto.polo_id || 1;
    const anoLetivoId = academicyear.Codigo;

    // 2. CHAMAR O SERVIÇO UTILIÁRIO
    const hashData = await this.hashService.generateInvoiceHashData(
      createInvoiceDto.TotalPreco,
      tipoDocumentoId,
      anoLetivoId,
      poloId,
      tipoDocumentoSigla,
      anoLetivoDesignacao
    );
    // 4. PREPARAÇÃO DA ENTIDADE ANTES DE SALVAR
    const invoiceToCreate = this.invoiceRepository.create({
      ...invoiceData,
      poloId: poloId,
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
    const savedInvoice = await this.invoiceRepository.save(invoiceToCreate);

    if (itens && itens.length > 0) {
      const invoiceItems = this.invoiceItemRepository.create(
        itens.map(item => ({
          codigoProduto: item.CodigoProduto,
          codigoFactura: savedInvoice.Codigo,
          quantidade: item.Quantidade,
          total: item.Total,
          obs: item.obs,
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
          estado: item.estado,
          valorPago: item.valorPago,
          valorATransportar: item.valorATransportar,
        }))
      );

      await this.invoiceItemRepository.save(invoiceItems);
    }

    return savedInvoice;
  }
  // ... (RESTANTE DOS MÉTODOS MANTIDOS) ...

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
  // Define uma função auxiliar (pode ser em um utils.ts ou logo acima/abaixo)


  async findByEnrollmentCode(filterQuery: InvoiceFilterEnrollmentDto): Promise<PagedResult<any>> {
    const { limit = 10, page = 1, codigoMatricula } = filterQuery;

    if (isNaN(codigoMatricula)) {
      throw new BadRequestException('O código de matrícula fornecido é inválido.');
    }

    const skip = (page - 1) * limit;

    // 1️⃣ TOTAL DE FATURAS
    const totalResult = await this.invoiceRepository.query(
      `SELECT COUNT(*) AS total FROM factura WHERE CodigoMatricula = ?`,
      [codigoMatricula],
    );
    const total = Number(totalResult[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    // 2️⃣ CONSULTA PRINCIPAL COM PAGINAÇÃO COMPATÍVEL
    const rawResults = await this.invoiceRepository.query(
      `
    SELECT 
      f.Codigo AS f_Codigo,
      f.DataFactura AS f_DataFactura,
      f.TotalPreco AS f_TotalPreco,
      f.CodigoMatricula AS f_CodigoMatricula,
      f.Referencia AS f_Referencia,
      f.Desconto AS f_Desconto,
      f.Troco AS f_Troco,
      f.totalIVA AS f_totalIVA,
      f.TotalMulta AS f_TotalMulta,
      f.total_incidencia AS f_total_incidencia,
      f.total_retencao AS f_total_retencao,
      f.ValorAPagar AS f_ValorAPagar,
      f.ValorEntregue AS f_ValorEntregue,
      f.ValorAPagarExtenso AS f_ValorAPagarExtenso,
      f.Descricao AS f_Descricao,
      f.ValorEntregueMltCX AS f_ValorEntregueMltCX,
      f.codigo_descricao AS f_codigo_descricao,
      f.NextFactura AS f_NextFactura,
      f.next AS f_next,
      f.texto_hash AS f_texto_hash,
      f.dataVencimento AS f_dataVencimento,
      f.polo_id AS f_polo_id,
      f.obs AS f_obs,
      f.hashValor AS f_hashValor,
      f.contaCorrente AS f_contaCorrente,
      f.faturaReference AS f_faturaReference,
      f.canal AS f_canal,
      f.ano_lectivo AS f_ano_lectivo,
      f.estado AS f_estado,
      f.corrente AS f_corrente,
      f.codigo_preinscricao AS f_codigo_preinscricao,
      f.numSequenciaFactura AS f_numSequenciaFactura,
      f.tipo_documento_factura_id AS f_tipo_documento_factura_id,
      p.Nome_Completo AS NomeCompletoAluno,
      p.Bilhete_Identidade AS BI_Aluno,
      p.Email AS EmailAluno,
      p.Contactos_Telefonicos,
      p.Data_Nascimento,
      fi.codigo AS fi_codigo,
      fi.CodigoProduto AS fi_CodigoProduto,
      fi.CodigoFactura AS fi_CodigoFactura,
      fi.Quantidade AS fi_Quantidade,
      fi.Total AS fi_Total,
      fi.OBS AS fi_OBS,
      fi.taxa_iva AS fi_taxa_iva,
      fi.valor_iva AS fi_valor_iva,
      fi.preco AS fi_preco,
      fi.retencao AS fi_retencao,
      fi.incidencia AS fi_incidencia,
      fi.valor_desconto AS fi_valor_desconto,
      fi.descontoProduto AS fi_descontoProduto,
      fi.Mes AS fi_Mes,
      fi.Multa AS fi_Multa,
      fi.mes_temp_id AS fi_mes_temp_id,
      fi.codigo_anoLectivo AS fi_codigo_anoLectivo,
      fi.estado AS fi_estado,
      fi.valor_pago AS fi_valor_pago,
      fi.valor_a_transportar AS fi_valor_a_transportar,
      ts.Descricao AS ts_Descricao,
      mt.designacao AS MesDesignacao
    FROM (
      SELECT Codigo
      FROM factura
      WHERE CodigoMatricula = ?
      ORDER BY Codigo DESC
      LIMIT ? OFFSET ?
    ) AS sub
    INNER JOIN factura f ON f.Codigo = sub.Codigo
    LEFT JOIN factura_items fi ON fi.CodigoFactura = f.Codigo
    LEFT JOIN tb_tipo_servicos ts ON fi.CodigoProduto = ts.Codigo
    LEFT JOIN mes_temp mt ON fi.mes_temp_id = mt.id
    INNER JOIN tb_matriculas m ON f.CodigoMatricula = m.Codigo
    INNER JOIN tb_admissao a ON m.Codigo_Aluno = a.codigo
    INNER JOIN tb_preinscricao p ON a.pre_incricao = p.Codigo
    ORDER BY f.Codigo DESC, fi.codigo ASC
    `,
      [codigoMatricula, limit, skip],
    );

    // 3️⃣ AGRUPAR RESULTADOS
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
  async findOne(Codigo: number): Promise<Invoice> {
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

    // O .update() retorna um UpdateResult, por isso, buscamos a entidade atualizada
    await this.invoiceRepository.update(Codigo, updateInvoiceDto);

    return this.findOne(Codigo); // Retorna a fatura atualizada
  }

  async updateStatusByReference(reference: string, status: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { Referencia: reference } });
    if (!invoice) {
      throw new NotFoundException(`Fatura com referência ${reference} não encontrada.`);
    }

    invoice.estado = status;
    return this.invoiceRepository.save(invoice);
  }
  async updateReferenceNumber(invoiceId: number,
    referenceNumber: string,
    dueDate: any,newAmount:number): Promise<Invoice> {
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

  /*
  async remove(Codigo: number): Promise<{ deleted: boolean; message?: string }> {
    const result = await this.invoiceRepository.delete(Codigo);

    if (result.affected === 0) {
      throw new NotFoundException(`Fatura com Código ${Codigo} não encontrada.`);
    }

    return { deleted: true };
  }
     */
}
function groupInvoices(rawData: any[]): any[] {
  const groupedData = new Map<number | string, any>();

  for (const row of rawData) {
    // Usamos o alias explícito que adicionamos no SELECT
    const invoiceId = row.fi_CodigoFactura || row.f_Codigo || row.CodigoFactura;

    if (!groupedData.has(invoiceId)) {
      // Cria o objeto da fatura, mapeando todas as colunas de f.*
      const invoice = {
        // DADOS DA FATURA (f.*, mapeados com prefixo 'f_')
        CodigoFactura: row.Cod_factura, // <== Chave de agrupamento
        Codigo: row.f_Codigo, // O código original (se CodigoFactura for diferente)
        DataFactura: row.f_DataFactura,
        TotalPreco: row.f_TotalPreco,
        CodigoMatricula: row.f_CodigoMatricula,
        Referencia: row.f_Referencia,
        Desconto: row.f_Desconto,
        Troco: row.f_Troco,
        totalIVA: row.f_totalIVA,
        TotalMulta: row.f_TotalMulta,
        total_incidencia: row.f_total_incidencia,
        total_retencao: row.f_total_retencao,
        ValorAPagar: row.f_ValorAPagar,
        ValorEntregue: row.f_ValorEntregue,
        ValorAPagarExtenso: row.f_ValorAPagarExtenso,
        Descricao: row.f_Descricao,
        ValorEntregueMltCX: row.f_ValorEntregueMltCX,
        codigo_descricao: row.f_codigo_descricao,
        NextFactura: row.f_NextFactura,
        next: row.f_next,
        texto_hash: row.f_texto_hash,
        dataVencimento: row.f_dataVencimento,
        polo_id: row.f_polo_id,
        obs: row.f_obs,
        hashValor: row.f_hashValor,
        contaCorrente: row.f_contaCorrente,
        faturaReference: row.f_faturaReference,
        canal: row.f_canal,
        ano_lectivo: row.f_ano_lectivo,
        estado: row.f_estado,
        corrente: row.f_corrente,
        codigo_preinscricao: row.f_codigo_preinscricao,
        numSequenciaFactura: row.f_numSequenciaFactura,
        tipo_documento_factura_id: row.f_tipo_documento_factura_id,

        // DADOS DO ALUNO (aliased no SELECT, sem prefixo 'f_')
        NomeCompletoAluno: row.NomeCompletoAluno,
        BI_Aluno: row.BI_Aluno,
        EmailAluno: row.EmailAluno,
        Contactos_Telefonicos: row.Contactos_Telefonicos,
        Data_Nascimento: row.Data_Nascimento,

        itens: [] // Inicializa a lista de itens
      };
      groupedData.set(invoiceId, invoice);
    }

    // Adiciona o item à fatura correspondente
    groupedData.get(invoiceId).itens.push({
      codigo: row.fi_codigo,
      CodigoProduto: row.fi_CodigoProduto,
      CodigoFactura: row.fi_CodigoFactura,
      Quantidade: row.fi_Quantidade,
      Total: row.fi_Total,
      OBS: row.fi_OBS,
      taxa_iva: row.fi_taxa_iva,
      valor_iva: row.fi_valor_iva,
      preco: row.fi_preco,
      retencao: row.fi_retencao,
      incidencia: row.fi_incidencia,
      valor_desconto: row.fi_valor_desconto,
      descontoProduto: row.fi_descontoProduto,
      Mes: row.fi_Mes,
      Multa: row.fi_Multa,
      mes_temp_id: row.fi_mes_temp_id,
      codigo_anoLectivo: row.fi_codigo_anoLectivo,
      estado: row.fi_estado,
      valor_pago: row.fi_valor_pago,
      valor_a_transportar: row.fi_valor_a_transportar,
      NomeServico: row.ts_Descricao,
      MesDesignacao: row.MesDesignacao,
    });

  }
  return Array.from(groupedData.values());
}
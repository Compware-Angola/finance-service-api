import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { InvoiceFilterEnrollmentDto } from './dto/Invoice-filter-enrollment-code.dto';
import { InvoiceFilterPreEnrollmentDto } from './dto/invoice-filter-preenrollment.dto';
import { InvoiceNumberingAndHashService } from './invoice-numbering-hash.service';
import { TypeInvoiceDocument } from './entities/type.invoice.document.entity';
import { AcademicYear } from './entities/academic.year.entity';
import { genearateKeyNumber } from '../util/generate-key-number';
import { generateDueDate } from '../util/generate-due-date';


@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,

    @InjectRepository(TypeInvoiceDocument)
    private readonly typeInvoiceDocumentRepository: Repository<TypeInvoiceDocument>,

    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,

    private readonly hashService: InvoiceNumberingAndHashService,
  ) { }
  /**
   * Cria e salva uma nova fatura no banco de dados, incluindo a geração de hash e sequenciamento.
   * @param createInvoiceDto Dados da nova fatura.
   * @returns A fatura criada.
   */
  async create(createInvoiceDto: CreateInvoiceDto, referenceParams?: string,
    dueDateParams?: string): Promise<Invoice> {
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
      ...createInvoiceDto,
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

    return this.invoiceRepository.save(invoiceToCreate);
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


  async findByEnrollmentCode(filterQuery: InvoiceFilterEnrollmentDto): Promise<PagedResult<Invoice>> {
    const { limit = 10, page = 1, codigoMatricula } = filterQuery;

    // 🛑 VERIFICAÇÃO DE SEGURANÇA CONTRA NaN
    if (isNaN(codigoMatricula)) {
      throw new BadRequestException('O código de matrícula fornecido é inválido.');
    }

    // Calcula o 'offset' (quantos itens pular)
    const skip = (page - 1) * limit;

    // TypeORM's findAndCount: [results, totalCount]
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: {
        CodigoMatricula: codigoMatricula // 🛑 CLÁUSULA WHERE COMENTADA
      },
      take: limit,
      skip: skip,
      order: { Codigo: 'DESC' },
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

  /**
   * Retorna todas as faturas de um código de pré-inscrição específico, com paginação.
   * @param filterQuery O DTO com os parâmetros de paginação e o codigoPreinscricao.
   * @returns Um objeto contendo a lista de faturas, total e informações de paginação.
   */
  async findByPreEnrollmentCode(filterQuery: InvoiceFilterPreEnrollmentDto): Promise<PagedResult<Invoice>> {
    const { limit = 10, page = 1, codigoPreinscricao } = filterQuery;

    // 🛑 VERIFICAÇÃO DE SEGURANÇA CONTRA NaN (importar BadRequestException no topo)
    if (isNaN(codigoPreinscricao)) {
      throw new BadRequestException('O código de pré-inscrição fornecido é inválido.');
    }

    // Calcula o 'offset' (quantos itens pular)
    const skip = (page - 1) * limit;

    // TypeORM's findAndCount: [results, totalCount]
    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where: {
        codigoPreinscricao: codigoPreinscricao
      },
      take: limit,
      skip: skip,
      order: { Codigo: 'DESC' },
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
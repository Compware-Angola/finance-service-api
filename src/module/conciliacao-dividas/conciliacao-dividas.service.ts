import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateConciliacaoDividaDto } from './dto/create-conciliacao-divida.dto';
import { Invoice } from 'src/module/invoice/entities/invoice.entity';
import { InvoiceItem } from 'src/module/invoice/entities/InvoiceIten.entity';
import { InvoiceService } from 'src/module/invoice/invoice.service';
import { CreateInvoiceDto } from 'src/module/invoice/dto/create-invoice.dto';
import { ReconciliacaoNegociacaoDivida } from './entities/conciliacao-divida.entity';
import { FindConciliacaoDividaDto } from './dto/find-conciliacao-divida.dto';
import { PagedResult } from '../debt_negotiation/list_debt_negotiation.service';
import { ReconciliacaoDecisaoEnum, ValidarConciliacaoDividaDto } from './dto/validar-conciliacao-divida.dto';

const ESTADO_FATURA_ELIMINADO = 3;
const ESTADO_INVOICE_PENDENTE = 0

@Injectable()
export class ConciliacaoDividasService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(ReconciliacaoNegociacaoDivida)
    private readonly reconciliacaoRepo: Repository<ReconciliacaoNegociacaoDivida>,
    private readonly invoiceService: InvoiceService,
    private readonly dataSource: DataSource,
  ) { }

  async create(
    createConciliacaoDividaDto: CreateConciliacaoDividaDto,
    createdBy: number,
  ) {
    const { invoices, descricao } = createConciliacaoDividaDto;

    // ============================================================
    // 1. PRÉ-VALIDAÇÃO — confere TUDO antes de criar qualquer coisa
    //    (evita criar fatura 1 e falhar na fatura 2 fora de transação)
    // ============================================================
    const errors: { invoiceId: number; mensagem: string }[] = [];
    const faturasOriginais = new Map<number, Invoice>();
    const itensOriginaisPorFatura = new Map<number, InvoiceItem[]>();

    const ESTADOS_BLOQUEADOS = [1, 3]; // ajuste conforme o enum real de estado da fatura

    for (const invoiceDto of invoices) {
      const faturaOriginal = await this.invoiceRepo.findOne({
        where: { Codigo: invoiceDto.invoiceId },
      });

      if (!faturaOriginal) {
        errors.push({
          invoiceId: invoiceDto.invoiceId,
          mensagem: `A fatura ${invoiceDto.invoiceId} não foi encontrada.`,
        });
        continue;
      }

      if (ESTADOS_BLOQUEADOS.includes(faturaOriginal.estado)) {
        errors.push({
          invoiceId: invoiceDto.invoiceId,
          mensagem: `A fatura ${invoiceDto.invoiceId} está com estado ${faturaOriginal.estado} e não pode ser conciliada.`,
        });
        continue;
      }

      // já existe uma conciliação PENDENTE envolvendo esta fatura?
      // (como fatura original OU como fatura proposta de outra conciliação)
      const reconciliacaoPendente = await this.reconciliacaoRepo.findOne({
        where: [
          {
            facturaOriginal: { Codigo: invoiceDto.invoiceId },
            status: 'PENDENTE',
          },
          {
            facturaPropostaAlteracao: { Codigo: invoiceDto.invoiceId },
            status: 'PENDENTE',
          },
        ],
      });

      if (reconciliacaoPendente) {
        errors.push({
          invoiceId: invoiceDto.invoiceId,
          mensagem: `A fatura ${invoiceDto.invoiceId} já possui uma conciliação pendente e não pode ser conciliada novamente.`,
        });
        continue;
      }

      const itensOriginais = await this.invoiceItemRepo.find({
        where: { CodigoFactura: invoiceDto.invoiceId } as any,
      });

      const idsExistentes = new Set(itensOriginais.map((i: any) => i.codigo));

      for (const itemDto of invoiceDto.itens) {
        if (!idsExistentes.has(itemDto.InvoiceItemId)) {
          errors.push({
            invoiceId: invoiceDto.invoiceId,
            mensagem: `O item ${itemDto.InvoiceItemId} não pertence à fatura ${invoiceDto.invoiceId}.`,
          });
        }
      }

      faturasOriginais.set(invoiceDto.invoiceId, faturaOriginal);
      itensOriginaisPorFatura.set(invoiceDto.invoiceId, itensOriginais);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Uma ou mais faturas/itens são inválidos.',
        errors,
      });
    }

    // ============================================================
    // 2. CRIAÇÃO — tudo dentro de UMA transação (rollback se algo falhar)
    // ============================================================
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resultados: ReconciliacaoNegociacaoDivida[] = [];

      for (const invoiceDto of invoices) {
        const faturaOriginal = faturasOriginais.get(invoiceDto.invoiceId)!;
        const itensOriginais = itensOriginaisPorFatura.get(
          invoiceDto.invoiceId,
        )!;

        // mapa InvoiceItemId (original) -> novo valor conciliado
        const valoresConciliados = new Map<number, number>(
          invoiceDto.itens.map((i) => [i.InvoiceItemId, i.valor]),
        );

        // monta os itens da NOVA fatura, herdando tudo do item original
        // e só sobrescrevendo o valor (Total/preco) quando vier no DTO
        const novosItens = itensOriginais.map((item: any) => {
          const novoValor = valoresConciliados.get(item.codigo);
          const usarNovoValor = novoValor !== undefined;

          return {
            CodigoProduto: item.CodigoProduto,
            Quantidade: item.Quantidade,
            Total: usarNovoValor ? novoValor : item.Total,
            preco: usarNovoValor ? novoValor : item.preco,
            obs: item.obs,
            taxaIva: item.taxaIva,
            valorIva: item.valorIva,
            retencao: item.retencao,
            incidencia: item.incidencia,
            valorDesconto: item.valorDesconto,
            descontoProduto: item.descontoProduto,
            mes: item.mes,
            multa: item.multa,
            mesTempId: item.mesTempId,
            codigo_anoLectivo: item.codigoAnoLectivo,
            valorPago: 0,
            valorATransportar: item.valorATransportar,
          };
        });

        const novoTotalPreco = novosItens.reduce(
          (soma, item) => soma + (item.Total ?? 0),
          0,
        );

        const createInvoiceDto: CreateInvoiceDto = {
          CodigoMatricula: faturaOriginal.CodigoMatricula,
          Desconto: faturaOriginal.Desconto,
          totalIVA: faturaOriginal.totalIVA,
          TotalMulta: faturaOriginal.TotalMulta,
          total_incidencia: faturaOriginal.totalIncidencia,
          total_retencao: faturaOriginal.totalRetencao,
          TotalPreco: novoTotalPreco,
          ValorAPagar: novoTotalPreco,
          Descricao:
            descricao ?? `Proposta de conciliação da fatura ${faturaOriginal.Codigo}`,
          codigo_descricao: faturaOriginal.codigoDescricao,
          polo_id: faturaOriginal.poloId,
          canal: faturaOriginal.canal,
          codigo_anoLectivo: faturaOriginal.anoLectivo,
          codigo_preinscricao: faturaOriginal.codigoPreinscricao,
          tipo_documento_factura_id: faturaOriginal.tipoDocumentoFacturaId,
          itens: novosItens,
        } as CreateInvoiceDto;

        // cria a fatura+itens reaproveitando a MESMA transação
        const faturaProposta = await this.invoiceService.create(
          createInvoiceDto,
          undefined, // referência: gera uma nova automaticamente
          undefined, // data de vencimento: gera uma nova automaticamente
          queryRunner.manager,
        );

        // força o estado "aguarda aprovação" na fatura e nos itens,
        // sobrescrevendo o que a lógica interna de isenção/pendente definiu
        await queryRunner.manager.update(
          Invoice,
          { Codigo: faturaProposta.Codigo },
          { estado: ESTADO_FATURA_ELIMINADO },
        );
        await queryRunner.manager.update(
          InvoiceItem,
          { CodigoFactura: faturaProposta.Codigo } as any,
          { estado: ESTADO_FATURA_ELIMINADO } as any,
        );

        const reconciliacao = queryRunner.manager.create(
          ReconciliacaoNegociacaoDivida,
          {
            facturaOriginal: { Codigo: faturaOriginal.Codigo } as Invoice,
            facturaPropostaAlteracao: {
              Codigo: faturaProposta.Codigo,
            } as Invoice,
            descricaoCriacao: descricao,
            status: 'PENDENTE',
            createdBy,
          },
        );

        resultados.push(
          await queryRunner.manager.save(
            ReconciliacaoNegociacaoDivida,
            reconciliacao,
          ),
        );
      }

      await queryRunner.commitTransaction();
      return resultados;
    } catch (err) {
      await queryRunner.rollbackTransaction();

      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException(
        'Erro ao criar a conciliação de negociação de dívida.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Aprova ou rejeita uma proposta de conciliação de dívida.
   */
  async validar(
    id: number,
    dto: ValidarConciliacaoDividaDto,
    validatedBy: number,
  ): Promise<ReconciliacaoNegociacaoDivida> {
    const reconciliacao = await this.reconciliacaoRepo.findOne({
      where: { id },
      relations: ['facturaOriginal', 'facturaPropostaAlteracao'],
    });

    if (!reconciliacao) {
      throw new NotFoundException(
        `Reconciliação com código ${id} não encontrada.`,
      );
    }

    if (reconciliacao.status !== 'PENDENTE') {
      throw new BadRequestException(
        `Esta reconciliação já foi ${reconciliacao.status.toLowerCase()} e não pode ser validada novamente.`,
      );
    }

    if (
      dto.decisao === ReconciliacaoDecisaoEnum.REJEITADO &&
      !dto.descricaoValidacao
    ) {
      throw new BadRequestException(
        'A descrição da validação é obrigatória ao rejeitar uma conciliação.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.decisao === ReconciliacaoDecisaoEnum.APROVADO) {
        // 1. Anula a fatura original (grava histórico de anulação)
        await this.invoiceService.annulInvoice(
          reconciliacao.facturaOriginal.Codigo,
          validatedBy,
          `Anulada por aprovação da conciliação #${reconciliacao.id}`,
        );

        // 2. Promove a fatura proposta para o estado ativo
        await queryRunner.manager.update(
          Invoice,
          { Codigo: reconciliacao.facturaPropostaAlteracao.Codigo },
          { estado: ESTADO_INVOICE_PENDENTE },
        );
        await queryRunner.manager.update(
          InvoiceItem,
          {
            CodigoFactura: reconciliacao.facturaPropostaAlteracao.Codigo,
          } as any,
          { estado: ESTADO_INVOICE_PENDENTE } as any,
        );
      }
      // Se REJEITADO: a fatura proposta permanece como está (inativa/estado 3)
      // e a fatura original não é alterada.

      reconciliacao.status = dto.decisao;
      reconciliacao.descricaoValidacao = dto.descricaoValidacao ?? '';
      reconciliacao.validatedBy = validatedBy;
      reconciliacao.validatedAt = new Date();

      const salvo = await queryRunner.manager.save(
        ReconciliacaoNegociacaoDivida,
        reconciliacao,
      );

      await queryRunner.commitTransaction();
      return salvo;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException(
        'Erro ao validar a conciliação de negociação de dívida.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lista todas as reconciliações, com filtros e paginação.
   */
  async findAll(
    filter: FindConciliacaoDividaDto,
  ): Promise<PagedResult<ReconciliacaoNegociacaoDivida>> {
    const {
      page = 1,
      limit = 10,
      status,
      facturaOriginalId,
      facturaPropostaId,
      createdBy,
    } = filter;

    const qb = this.reconciliacaoRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.facturaOriginal', 'facturaOriginal')
      .leftJoinAndSelect('r.facturaPropostaAlteracao', 'facturaProposta')
      .orderBy('r.id', 'DESC');

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }
    if (facturaOriginalId) {
      qb.andWhere('facturaOriginal.Codigo = :facturaOriginalId', {
        facturaOriginalId,
      });
    }
    if (facturaPropostaId) {
      qb.andWhere('facturaProposta.Codigo = :facturaPropostaId', {
        facturaPropostaId,
      });
    }
    if (createdBy) {
      qb.andWhere('r.createdBy = :createdBy', { createdBy });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Detalhe de uma reconciliação específica.
   */
  async findOne(id: number): Promise<ReconciliacaoNegociacaoDivida> {
    const reconciliacao = await this.reconciliacaoRepo.findOne({
      where: { id },
      relations: ['facturaOriginal', 'facturaPropostaAlteracao'],
    });

    if (!reconciliacao) {
      throw new NotFoundException(
        `Reconciliação com código ${id} não encontrada.`,
      );
    }

    return reconciliacao;
  }
}
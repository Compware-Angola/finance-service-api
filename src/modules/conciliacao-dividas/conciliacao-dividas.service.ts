import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateConciliacaoDividaDto } from './dto/create-conciliacao-divida.dto';
import { Invoice } from 'src/modules/invoice/entities/invoice.entity';
import { InvoiceItem } from 'src/modules/invoice/entities/InvoiceIten.entity';
import { InvoiceService } from 'src/modules/invoice/invoice.service';
import { CreateInvoiceDto } from 'src/modules/invoice/dto/create-invoice.dto';
import { ReconciliacaoNegociacaoDivida } from './entities/conciliacao-divida.entity';
import { FindConciliacaoDividaDto } from './dto/find-conciliacao-divida.dto';
import { PagedResult } from '../debt_negotiation/list_debt_negotiation.service';
import {
  ReconciliacaoDecisaoEnum,
  ValidarConciliacaoDividaDto,
} from './dto/validar-conciliacao-divida.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

const ESTADO_FATURA_ELIMINADO = 3;
const ESTADO_INVOICE_PENDENTE = 0;

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
  ) {}

  async create(
    createConciliacaoDividaDto: CreateConciliacaoDividaDto,
    createdBy: number,
  ) {
    const { invoices, descricao, codigoNegociacaoDivida } =
      createConciliacaoDividaDto;

    // ============================================================
    // 1. PRÉ-VALIDAÇÃO — confere TUDO antes de criar qualquer coisa
    //    (evita criar fatura 1 e falhar na fatura 2 fora de transação)
    // ============================================================
    const errors: { invoiceId: number; mensagem: string }[] = [];
    const faturasOriginais = new Map<number, Invoice>();
    const itensOriginaisPorFatura = new Map<number, InvoiceItem[]>();

    const ESTADOS_BLOQUEADOS = [1, 3]; // ajuste conforme o enum real de estado da fatura

    for (const invoiceDto of invoices) {
      // Busca a fatura original no banco
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

      // Bloqueia se já existe conciliação PENDENTE envolvendo esta fatura
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

      // >>> AQUI busca TODOS os itens da fatura original (alterados + não alterados) <
      const itensOriginais = await this.invoiceItemRepo.find({
        where: { CodigoFactura: invoiceDto.invoiceId } as any,
      });

      const idsExistentes = new Set(itensOriginais.map((i: any) => i.codigo));

      // Valida que todo item enviado no DTO realmente pertence a esta fatura
      for (const itemDto of invoiceDto.itens) {
        if (!idsExistentes.has(itemDto.InvoiceItemId)) {
          errors.push({
            invoiceId: invoiceDto.invoiceId,
            mensagem: `O item ${itemDto.InvoiceItemId} não pertence à fatura ${invoiceDto.invoiceId}.`,
          });
        }
      }

      // Guarda em memória pra reaproveitar na fase 2 (evita bater no banco de novo)
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

        // =========================================================
        // 2.2 EXCLUSÃO - EXCLUIR ITENS QUE NÃO DEVE PERTENCER A FACTURA
        // =========================================================
        const idsExcluidos = new Set(
          (invoiceDto.itensExcluidos ?? []).map((i) => i.InvoiceItemId),
        );
        const itensParaIncluir = itensOriginais.filter(
          (item: any) => !idsExcluidos.has(item.codigo),
        );

        // Mapa InvoiceItemId (original) -> novo valor conciliado.
        // Só contém entradas para os itens que o usuário quis MUDAR.
        const valoresConciliados = new Map<number, number>(
          invoiceDto.itens.map((i) => [i.InvoiceItemId, i.valor]),
        );

        // >>> AQUI é onde os itens não alterados entram <
        // Percorre TODOS os itens originais (itensOriginais), não só os
        // que vieram no DTO. Para cada item:
        //   - se ele estiver em valoresConciliados -> usa o novo valor
        //   - se NÃO estiver (ou seja, não foi alterado) -> mantém item.Total / item.preco originais
        // Resultado: novosItens já sai com a fatura INTEIRA (alterados + não alterados).
        const novosItens = itensOriginais.map((item: any) => {
          const novoValor = valoresConciliados.get(item.codigo);
          const usarNovoValor = novoValor !== undefined;

          return {
            CodigoProduto: item.CodigoProduto,
            Quantidade: item.Quantidade,
            Total: usarNovoValor ? novoValor : item.total, // item não alterado mantém o Total original
            preco: usarNovoValor ? novoValor : item.preco, // item não alterado mantém o preco original
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

        console.log(novosItens, 'NOVO');

        // Soma o total usando SOMENTE novosItens, porque ele já contém
        // TODOS os itens (alterados e não alterados). Somar de novo os
        // "não alterados" duplicaria o valor deles no total.
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
            descricao ??
            `Proposta de conciliação da fatura ${faturaOriginal.Codigo}`,
          codigo_descricao: faturaOriginal.codigoDescricao,
          polo_id: faturaOriginal.poloId,
          canal: faturaOriginal.canal,
          codigo_anoLectivo: faturaOriginal.anoLectivo,
          codigo_preinscricao: faturaOriginal.codigoPreinscricao,
          tipo_documento_factura_id: faturaOriginal.tipoDocumentoFacturaId,
          // itens JÁ contém tudo — alterados com novo valor, não alterados com valor original
          itens: novosItens,
        } as CreateInvoiceDto;

        // Cria a fatura+itens reaproveitando a MESMA transação
        const faturaProposta = await this.invoiceService.create(
          createInvoiceDto,
          undefined, // referência: gera uma nova automaticamente
          undefined, // data de vencimento: gera uma nova automaticamente
          queryRunner.manager,
        );

        // Força o estado "aguarda aprovação" na fatura e nos itens,
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
            codigoNegociacaoDivida: codigoNegociacaoDivida,
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

      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
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
  ): Promise<{
    message: string;
    estadoFacturaOriginal: string | number;
    estadoFacturaPropostaAlteracao: string | number;
  }> {
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
            CodigoFactura: reconciliacao.facturaOriginal.Codigo,
          } as any,
          { estado: ESTADO_FATURA_ELIMINADO } as any,
        );
      }
      // Se REJEITADO: a fatura proposta permanece como está (inativa/estado 3)
      // e a fatura original não é alterada.

      reconciliacao.status = dto.decisao;
      reconciliacao.descricaoValidacao = dto.descricaoValidacao ?? '';
      reconciliacao.validatedBy = validatedBy;
      reconciliacao.validatedAt = new Date();

      await queryRunner.manager.save(
        ReconciliacaoNegociacaoDivida,
        reconciliacao,
      );

      await queryRunner.commitTransaction();
      return {
        message: 'Conciliação validada com sucesso.',
        estadoFacturaOriginal:
          dto.decisao === ReconciliacaoDecisaoEnum.REJEITADO
            ? 'ANULADA'
            : ESTADO_INVOICE_PENDENTE,
        estadoFacturaPropostaAlteracao:
          dto.decisao === ReconciliacaoDecisaoEnum.APROVADO
            ? ESTADO_INVOICE_PENDENTE
            : 'ANULADA',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
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
  async findAll(filter: FindConciliacaoDividaDto): Promise<PagedResult<any>> {
    const {
      page = 1,
      limit = 10,
      status,
      facturaOriginalId,
      facturaPropostaId,
      createdBy,
      codigoAnoLectivo,
      codigoCurso,
      codigoMatricula,
      nome,
    } = filter;

    const offset = (page - 1) * limit;

    const params = {
      status: status ?? null,
      facturaOriginalId: facturaOriginalId ?? null,
      facturaPropostaId: facturaPropostaId ?? null,
      createdBy: createdBy ?? null,
      codigoAnoLectivo: codigoAnoLectivo ?? null,
      codigoCurso: codigoCurso ?? null,
      codigoMatricula: codigoMatricula ?? null,
      nome: nome ?? null,
    };

    /* =============================================
       QUERY PRINCIPAL PAGINADA
       ============================================= */
    const dataSql = `
    SELECT
      r.CODIGO                 AS id,
      r.STATUS                 AS status,
      r.DESCRICAO_CRIACAO      AS descricao_criacao,
      r.DESCRICAO_VALIDACAO    AS descricao_validacao,
      r.CREATED_AT             AS created_at,
      r.UPDATED_AT             AS updated_at,
      r.CREATED_BY             AS created_by,
      r.VALIDATED_BY           AS validated_by,
      r.VALIDATED_AT           AS validated_at,

      fo.CODIGO                AS factura_original_id,
      fo.DESCRICAO             AS factura_original_descricao,
      fo.REFERENCIA            AS factura_original_referencia,
      fo.ESTADO                AS factura_original_estado,
      fo.TOTALPRECO            AS factura_original_total_preco,
      fo.VALORAPAGAR           AS factura_original_valor_apagar,
      fo.DATAFACTURA           AS factura_original_data,
      fo.ANO_LECTIVO           AS factura_original_ano_lectivo,

      fp.CODIGO                AS factura_proposta_id,
      fp.DESCRICAO             AS factura_proposta_descricao,
      fp.REFERENCIA            AS factura_proposta_referencia,
      fp.ESTADO                AS factura_proposta_estado,
      fp.TOTALPRECO            AS factura_proposta_total_preco,
      fp.VALORAPAGAR           AS factura_proposta_valor_apagar,
      fp.DATAFACTURA           AS factura_proposta_data,

      m.codigo                 AS codigo_matricula,
      p.NOME_COMPLETO           AS nome_estudante,
      c.codigo                 AS codigo_curso,
      c.designacao             AS curso,
      f.DESIGNACAO             AS faculdade

    FROM FK2_TB_RECONCILIACAO_NEGOCIACAO_DIVIDA r
    INNER JOIN FK2_FACTURA fo          ON fo.CODIGO = r.FACTURA_ORIGINAL
    LEFT  JOIN FK2_FACTURA fp          ON fp.CODIGO = r.FACTURA_PROPOSTA_ALTERACAO
    LEFT  JOIN FK2_TB_MATRICULAS m     ON m.codigo  = fo.CODIGOMATRICULA
    LEFT  JOIN FK2_TB_ADMISSAO a       ON a.codigo  = m.CODIGO_ALUNO
    LEFT  JOIN FK2_TB_PREINSCRICAO p   ON p.codigo  = a.PRE_INCRICAO
    LEFT  JOIN FK2_TB_CURSOS c         ON c.codigo  = m.CODIGO_CURSO
    LEFT  JOIN FK2_TB_FACULDADE f      ON f.codigo  = c.FACULDADE_ID
    WHERE 1=1
      AND (:status IS NULL             OR r.STATUS      = :status)
      AND (:facturaOriginalId IS NULL  OR fo.CODIGO     = :facturaOriginalId)
      AND (:facturaPropostaId IS NULL  OR fp.CODIGO     = :facturaPropostaId)
      AND (:createdBy IS NULL          OR r.CREATED_BY  = :createdBy)
      AND (:codigoAnoLectivo IS NULL   OR fo.ANO_LECTIVO = :codigoAnoLectivo)
      AND (:codigoCurso IS NULL        OR c.codigo      = :codigoCurso)
      AND (:codigoMatricula IS NULL    OR m.codigo      = :codigoMatricula)
      AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
    ORDER BY r.CODIGO DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const rawResults = await this.dataSource.query(dataSql, {
      ...params,
      offset,
      limit,
    } as any);

    /* =============================================
       QUERY DE CONTAGEM TOTAL
       ============================================= */
    const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_RECONCILIACAO_NEGOCIACAO_DIVIDA r
    INNER JOIN FK2_FACTURA fo          ON fo.CODIGO = r.FACTURA_ORIGINAL
    LEFT  JOIN FK2_FACTURA fp          ON fp.CODIGO = r.FACTURA_PROPOSTA_ALTERACAO
    LEFT  JOIN FK2_TB_MATRICULAS m     ON m.codigo  = fo.CODIGOMATRICULA
    LEFT  JOIN FK2_TB_ADMISSAO a       ON a.codigo  = m.CODIGO_ALUNO
    LEFT  JOIN FK2_TB_PREINSCRICAO p   ON p.codigo  = a.PRE_INCRICAO
    LEFT  JOIN FK2_TB_CURSOS c         ON c.codigo  = m.CODIGO_CURSO
    WHERE 1=1
      AND (:status IS NULL             OR r.STATUS      = :status)
      AND (:facturaOriginalId IS NULL  OR fo.CODIGO     = :facturaOriginalId)
      AND (:facturaPropostaId IS NULL  OR fp.CODIGO     = :facturaPropostaId)
      AND (:createdBy IS NULL          OR r.CREATED_BY  = :createdBy)
      AND (:codigoAnoLectivo IS NULL   OR fo.ANO_LECTIVO = :codigoAnoLectivo)
      AND (:codigoCurso IS NULL        OR c.codigo      = :codigoCurso)
      AND (:codigoMatricula IS NULL    OR m.codigo      = :codigoMatricula)
      AND (:nome IS NULL OR fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%')
    `;

    const totalResult = await this.dataSource.query(countSql, params as any);
    const total = Number(totalResult[0]?.TOTAL ?? 0);

    /* =============================================
       MONTA O RESULTADO FINAL
       ============================================= */
    const data = toLowerCaseKeys(rawResults).map((row: any) => ({
      id: row.id,
      status: row.status,
      descricaoCriacao: row.descricao_criacao,
      descricaoValidacao: row.descricao_validacao,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      validatedBy: row.validated_by,
      validatedAt: row.validated_at,
      facturaOriginal: {
        codigo: row.factura_original_id,
        descricao: row.factura_original_descricao,
        referencia: row.factura_original_referencia,
        estado: row.factura_original_estado,
        totalPreco: Number(row.factura_original_total_preco ?? 0),
        valorApagar: Number(row.factura_original_valor_apagar ?? 0),
        data: row.factura_original_data,
        anoLectivo: row.factura_original_ano_lectivo,
      },
      facturaPropostaAlteracao: row.factura_proposta_id
        ? {
            codigo: row.factura_proposta_id,
            descricao: row.factura_proposta_descricao,
            referencia: row.factura_proposta_referencia,
            estado: row.factura_proposta_estado,
            totalPreco: Number(row.factura_proposta_total_preco ?? 0),
            valorApagar: Number(row.factura_proposta_valor_apagar ?? 0),
            data: row.factura_proposta_data,
          }
        : null,
      estudante: {
        codigoMatricula: row.codigo_matricula,
        nome: row.nome_estudante,
        codigoCurso: row.codigo_curso,
        curso: row.curso,
        faculdade: row.faculdade,
      },
    }));

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
  async findOne(id: number): Promise<any> {
    const sql = `
  SELECT
    r.CODIGO                 AS id,
    r.STATUS                 AS status,
    r.DESCRICAO_CRIACAO      AS descricao_criacao,
    r.DESCRICAO_VALIDACAO    AS descricao_validacao,
    r.CREATED_AT             AS created_at,
    r.UPDATED_AT             AS updated_at,
    r.CREATED_BY             AS created_by,
    r.VALIDATED_BY           AS validated_by,
    r.VALIDATED_AT           AS validated_at,

    fo.CODIGO                AS factura_original_id,
    fo.DESCRICAO             AS factura_original_descricao,
    fo.REFERENCIA            AS factura_original_referencia,
    fo.ESTADO                AS factura_original_estado,
    fo.TOTALPRECO            AS factura_original_total_preco,
    fo.VALORAPAGAR           AS factura_original_valor_apagar,
    fo.DATAFACTURA           AS factura_original_data,
    fo.ANO_LECTIVO           AS factura_original_ano_lectivo,

    fp.CODIGO                AS factura_proposta_id,
    fp.DESCRICAO             AS factura_proposta_descricao,
    fp.REFERENCIA            AS factura_proposta_referencia,
    fp.ESTADO                AS factura_proposta_estado,
    fp.TOTALPRECO            AS factura_proposta_total_preco,
    fp.VALORAPAGAR           AS factura_proposta_valor_apagar,
    fp.DATAFACTURA           AS factura_proposta_data,

    m.CODIGO                 AS codigo_matricula,
    p.NOME_COMPLETO          AS nome_estudante,
    c.CODIGO                 AS codigo_curso,
    c.DESIGNACAO             AS curso,
    f.DESIGNACAO             AS faculdade

  FROM FK2_TB_RECONCILIACAO_NEGOCIACAO_DIVIDA r
  INNER JOIN FK2_FACTURA fo
    ON fo.CODIGO = r.FACTURA_ORIGINAL

  LEFT JOIN FK2_FACTURA fp
    ON fp.CODIGO = r.FACTURA_PROPOSTA_ALTERACAO

  LEFT JOIN FK2_TB_MATRICULAS m
    ON m.CODIGO = fo.CODIGOMATRICULA

  LEFT JOIN FK2_TB_ADMISSAO a
    ON a.CODIGO = m.CODIGO_ALUNO

  LEFT JOIN FK2_TB_PREINSCRICAO p
    ON p.CODIGO = a.PRE_INCRICAO

  LEFT JOIN FK2_TB_CURSOS c
    ON c.CODIGO = m.CODIGO_CURSO

  LEFT JOIN FK2_TB_FACULDADE f
    ON f.CODIGO = c.FACULDADE_ID

  WHERE r.CODIGO = :id
`;

    const result = await this.dataSource.query(sql, { id } as any);

    if (!result.length) {
      throw new NotFoundException(
        `Reconciliação com código ${id} não encontrada.`,
      );
    }

    const row = toLowerCaseKeys(result)[0];

    /* =============================================
       ITENS DAS FACTURAS (ORIGINAL E PROPOSTA)
       Busca única trazendo a descrição do serviço
       via JOIN com FK2_TB_TIPO_SERVICOS
       ============================================= */
    const facturaIds = [
      row.factura_original_id,
      row.factura_proposta_id,
    ].filter((v) => v !== null && v !== undefined);

    const itensPorFactura = new Map<number, any[]>();

    if (facturaIds.length > 0) {
      const itensSql = `
      SELECT
        fi.CODIGOFACTURA     AS codigo_factura,
        fi.CODIGO            AS item_id,
        s.DESCRICAO          AS item_descricao,
        fi.QUANTIDADE        AS item_quantidade,
        s.PRECO              AS item_preco_unitario,
        fi.TOTAL             AS item_valor_total,
        mt.DESIGNACAO        AS mes_designacao,
        fi.MULTA             AS item_multa,
        fi.VALOR_DESCONTO    AS item_valor_desconto,
        fi.DESCONTOPRODUTO   AS item_desconto_produto
      FROM FK2_FACTURA_ITEMS fi
      LEFT JOIN FK2_TB_TIPO_SERVICOS s ON s.CODIGO = fi.CODIGOPRODUTO
      LEFT JOIN FK2_MES_TEMP mt ON mt.ID = fi.MES_TEMP_ID
      WHERE fi.CODIGOFACTURA IN (${facturaIds.join(',')})
      ORDER BY fi.CODIGOFACTURA, fi.CODIGO
    `;

      const itensRaw: any[] = await this.dataSource.query(itensSql);

      for (const item of itensRaw) {
        const faId = Number(item.CODIGO_FACTURA);
        if (!itensPorFactura.has(faId)) {
          itensPorFactura.set(faId, []);
        }
        itensPorFactura.get(faId)!.push({
          codigo: item.ITEM_ID,
          descricao: item.ITEM_DESCRICAO,
          quantidade: Number(item.ITEM_QUANTIDADE ?? 0),
          preco_unitario: Number(item.ITEM_PRECO_UNITARIO ?? 0),
          valor_total: Number(item.ITEM_VALOR_TOTAL ?? 0),
          mes_designacao: item.MES_DESIGNACAO,
          multa: Number(item.ITEM_MULTA ?? 0),
          valor_desconto: Number(item.ITEM_VALOR_DESCONTO ?? 0),
          desconto_produto: Number(item.ITEM_DESCONTO_PRODUTO ?? 0),
        });
      }
    }

    const itensFacturaOriginal =
      itensPorFactura.get(Number(row.factura_original_id)) ?? [];
    const itensFacturaProposta = row.factura_proposta_id
      ? (itensPorFactura.get(Number(row.factura_proposta_id)) ?? [])
      : [];

    return {
      id: row.id,
      status: row.status,
      descricaoCriacao: row.descricao_criacao,
      descricaoValidacao: row.descricao_validacao,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      validatedBy: row.validated_by,
      validatedAt: row.validated_at,

      facturaOriginal: {
        codigo: row.factura_original_id,
        descricao: row.factura_original_descricao,
        referencia: row.factura_original_referencia,
        estado: row.factura_original_estado,
        totalPreco: Number(row.factura_original_total_preco ?? 0),
        valorApagar: Number(row.factura_original_valor_apagar ?? 0),
        data: row.factura_original_data,
        anoLectivo: row.factura_original_ano_lectivo,
        itens: itensFacturaOriginal,
      },

      facturaPropostaAlteracao: row.factura_proposta_id
        ? {
            codigo: row.factura_proposta_id,
            descricao: row.factura_proposta_descricao,
            referencia: row.factura_proposta_referencia,
            estado: row.factura_proposta_estado,
            totalPreco: Number(row.factura_proposta_total_preco ?? 0),
            valorApagar: Number(row.factura_proposta_valor_apagar ?? 0),
            data: row.factura_proposta_data,
            itens: itensFacturaProposta,
          }
        : null,

      estudante: {
        codigoMatricula: row.codigo_matricula,
        nome: row.nome_estudante,
        codigoCurso: row.codigo_curso,
        curso: row.curso,
        faculdade: row.faculdade,
      },
    };
  }
}

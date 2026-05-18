import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In as TypeOrmIn, DeepPartial } from 'typeorm';
import { CreateDebtNegotiationDto } from './dto/create-debt_negotiation.dto';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/InvoiceIten.entity';
import { TbMatricula } from './entities/tb-matricula.entity';
import { TbAdmissao } from './entities/tb-admissao.entity';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { DebtNegotiation } from './entities/debt_negotiation.entity';
import { InscricaoAvaliacao } from './entities/inscricao-avaliacao.entity';
import { CreateInvoiceDto } from '../invoice/dto/create-invoice.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { InvoiceItemDto } from '../invoice/dto/create-invoice-itens.dto';
import { safeNumber } from '../util/formate-number';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { MensalidadeItemDto, ServicoItemDto } from './dto/util.dto';

type AlunoInfo = {
  matricula: number;
  codigo_inscricao: number;
  alunoCacuaco: number;
  desconto: number;
  codigoTipoCandidatura: number;
  polo_id: number;
};

@Injectable()
export class CreateDebtNegotiationService {
  private readonly logger = new Logger(CreateDebtNegotiationService.name);
  private anoAtualPrincipal: number;

  constructor(
    private readonly anoLectivoUtil: AnoLectivoUtil,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(TbPreinscricao) private readonly preinscricaoRepo: Repository<TbPreinscricao>,
    @InjectRepository(TbMatricula) private readonly matriculaRepo: Repository<TbMatricula>,
    @InjectRepository(TbAdmissao) private readonly admissaoRepo: Repository<TbAdmissao>,
    @InjectRepository(AcademicYear) private readonly academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(DebtNegotiation) private readonly negotiationRepo: Repository<DebtNegotiation>,
    @InjectRepository(InscricaoAvaliacao) private readonly avaliacaoRepo: Repository<InscricaoAvaliacao>,
    private readonly dataSource: DataSource,
    private readonly invoiceService: InvoiceService,
  ) {
    this.initAnoAtual();
    InvoiceItem.setRepository(this.invoiceItemRepo);
    DebtNegotiation.setRepository(this.negotiationRepo);
  }

  private async initAnoAtual(): Promise<void> {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }

  // ============================================================
  // MÉTODO PRINCIPAL
  // ============================================================

  async createDebtNegotiation(
    dto: CreateDebtNegotiationDto,
    codigo_matricula: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar aluno
      const aluno = await this.getAlunoPorMatricula(codigo_matricula);
      if (!aluno) throw new BadRequestException('Matrícula não encontrada');

      // 2. Buscar ano letivo atual
      const anoLectivo = await this.academicYearRepo.findOne({
        where: { Codigo: this.anoAtualPrincipal },
      });
      if (!anoLectivo) throw new BadRequestException('Ano letivo não encontrado');

      // 3. Verificar se já existe negociação neste ano
      const negociacaoExistente = await this.negotiationRepo.findOne({
        where: {
          codigo_matricula: aluno.matricula,
          codigo_ano_lectivo: this.anoAtualPrincipal,
        },
      });

      if (!negociacaoExistente) {
        throw new BadRequestException(
          `Aluno ${aluno.matricula} já possui negociação no ano letivo ${anoLectivo.Designacao}`,
        );
      }

      // 4. Separar itens por tipo
      const itensMensalidades = dto.Mensalidades ?? [];
      const itensServicos = dto.OutrosServicos ?? [];
      const todosItensDto = [...itensMensalidades, ...itensServicos];

      // 5. Determinar tipo e calcular valores
      // 6 . Se valor pago na 
      const isTotal = dto.tipoPagamento === 'TOTAL';
      const tipo_negociacao_id = isTotal ? 2 : 1;
      const valorOriginal = parseFloat((dto.totalDivida ?? 0).toFixed(2));

      const { primeiroValorApagar, valorRestante } = this.calcularValoresPagamento(
        isTotal,
        valorOriginal
      );

      // 6. Montar base da fatura
      const totalMulta = todosItensDto.reduce((s, d) => s + (d.multa ?? 0), 0);

      const baseInvoiceDto: Partial<CreateInvoiceDto> = {
        DataFactura: new Date().toISOString(),
        polo_id: aluno.polo_id || 1,
        TotalPreco: 0,
        ValorAPagar: 0,
        Descricao: '',
        codigo_descricao: 5,
        tipo_documento_factura_id: 2,
        Desconto: dto.desconto ?? 0,
        totalIVA: dto.totalIVA ?? 0,
        total_incidencia: dto.total_incidencia ?? 0,
        total_retencao: dto.total_retencao ?? 0,
        TotalMulta: totalMulta,
        canal: 1,
        CodigoMatricula: aluno.matricula,
        codigo_preinscricao: aluno.codigo_inscricao,
      };

      // 7. Mapear todos os itens para InvoiceItemDto
      const todosItens: InvoiceItemDto[] = [
        ...this.mapMensalidadesParaItens(itensMensalidades),
        ...this.mapServicosParaItens(itensServicos),
      ];

      // 8. Criar fatura de entrada
      const faturaEntrada = await this.invoiceService.create({
        ...baseInvoiceDto,
        Descricao: isTotal
          ? 'Negociação de Dívida - Pagamento Total'
          : 'Negociação de Dívida - Entrada 50%',
        TotalPreco: dto.totalDivida ?? dto.precoTotal ?? 0,
        ValorAPagar: primeiroValorApagar,
        itens: todosItens,
      } as CreateInvoiceDto);

      // 9. Criar fatura de saldo restante (apenas parcelado)
      let faturaSaldo: Invoice | null = null;

      if (!isTotal && valorRestante > 0) {
        faturaSaldo = await this.invoiceService.create({
          ...baseInvoiceDto,
          Descricao: 'Negociação de Dívida - Saldo Restante (Parcelado)',
          TotalPreco: valorRestante,
          ValorAPagar: valorRestante,
          itens: todosItens,
        } as CreateInvoiceDto);
      }

      // 10. Anular faturas antigas e redirecionar avaliações
      const codigosAntigos: number[] = [
        // Códigos das Mensalidades
        ...itensMensalidades
          .map(item => item.codigo_factura)
          .filter((id): id is number => id !== undefined && id !== null),

        // Códigos dos Outros Serviços
        ...itensServicos
          .map(item => item.codfacturaoutrosservicos)
          .filter((id): id is number => id !== undefined && id !== null),
      ];

      // Remover duplicados (opcional, mas recomendado)
      const codigosAntigosUnicos = [...new Set(codigosAntigos)];

      if (codigosAntigos.length > 0) {
        await queryRunner.manager.update(
          Invoice,
          { Codigo: TypeOrmIn(codigosAntigosUnicos) },
          { estado: 3 },
        );

        await queryRunner.manager.update(
          InscricaoAvaliacao,
          { codigo_factura: TypeOrmIn(codigosAntigosUnicos) },
          { codigo_factura: faturaEntrada.Codigo },
        );
      }


      // 11. Calcular prestações + meses inicial e final (VERSÃO ROBUSTA)


      const qtd_meses = itensMensalidades?.length ?? 0;

      let id_mes_inicial: number = 0;
      let id_mes_final: number | null = null;


      if (qtd_meses > 0) {
        const ordenadas = [...itensMensalidades].sort(
          (a, b) => Number(a.mes_temp_id) - Number(b.mes_temp_id)
        );

        id_mes_inicial = Number(ordenadas[0].mes_temp_id);
        id_mes_final = Number(ordenadas[ordenadas.length - 1].mes_temp_id);

      }

      // Cálculo seguro de valorPrestacaoMensal
      let valorPrestacaoMensal = 0;

      if (qtd_meses > 0) {
        const totalMensal = itensMensalidades.reduce((sum, item) => {
          const valor = Number(item.total) || Number(item.valor) || 0;
          return sum + (isNaN(valor) ? 0 : valor);
        }, 0);

        valorPrestacaoMensal = parseFloat((totalMensal / qtd_meses).toFixed(2));
      }

      // Evita NaN
      if (isNaN(valorPrestacaoMensal)) valorPrestacaoMensal = 0;


      // 12. Criar registo de negociação
      const negociacao = queryRunner.manager.create(DebtNegotiation, {
        valor_divida: valorOriginal,
        primeiroValorApagar,
        valorRestante,
        codigo_matricula: aluno.matricula,
        codigo_ano_lectivo: anoLectivo.Codigo,
        codigo_fatura: faturaEntrada.Codigo,
        qtd_prestacoes: qtd_meses,
        tipo_negociacao_id,
        valorPrestacoes: valorPrestacaoMensal,
        id_mes_inicial: id_mes_inicial,
        id_mes_final: id_mes_final,
        mesesQuitar: qtd_meses,
        mesesParImpar: '',
        estado: 1,
      } as DeepPartial<DebtNegotiation>);
      await queryRunner.manager.save(negociacao);

      // 13. Registar faturas na tabela de relação
      await queryRunner.manager.query(
        `INSERT INTO FK2_TB_NEGOCIACAO_FACTURA (CODIGO_FACTURA, CODIGO_NEGOCIACAO) VALUES (:codigo_factura, :codigo_negociacao)`,
        { codigo_factura: faturaEntrada.Codigo, codigo_negociacao: negociacao.id } as any,
      );

      if (!isTotal && faturaSaldo?.Codigo) {
        await queryRunner.manager.query(
          `INSERT INTO FK2_TB_NEGOCIACAO_FACTURA (CODIGO_FACTURA, CODIGO_NEGOCIACAO) VALUES (:codigo_factura, :codigo_negociacao)`,
          { codigo_factura: faturaSaldo.Codigo, codigo_negociacao: negociacao.id } as any,
        );
      }

      await queryRunner.commitTransaction();

      return {
        mensagem: 'Negociação criada com sucesso',
        fatura_entrada_id: faturaEntrada.Codigo,
        fatura_saldo_id: faturaSaldo?.Codigo ?? null,
        tipo: isTotal ? 'TOTAL' : 'PARCELADO',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro na negociação de dívida', error?.stack ?? error);
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException(error.message || 'Erro ao processar negociação de dívida');
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // MÉTODOS PRIVADOS
  // ============================================================

  private calcularValoresPagamento(
    isTotal: boolean,
    valorOriginal: number
  ): { primeiroValorApagar: number; valorRestante: number } {
    if (isTotal) {
      return {
        primeiroValorApagar: valorOriginal,
        valorRestante: 0,
      };
    }

    const metade = parseFloat((valorOriginal / 2).toFixed(2));
    return {
      primeiroValorApagar: metade,
      valorRestante: metade,
    };
  }

  private mapMensalidadesParaItens(itensMensalidades: MensalidadeItemDto[]): InvoiceItemDto[] {
    return itensMensalidades.map(d => ({
      CodigoProduto: d.codigo_servico ?? null,
      Quantidade: 1,
      Total: safeNumber(d.total),
      obs: d.obs
        ? `Mensalidade de ${d.mes}`.substring(0, 45)
        : d.servico
          ? `Mensalidade/Serviço: ${d.obs}`.substring(0, 45)
          : '',
      taxaIva: safeNumber(d.multa),
      valorIva: safeNumber(d.valor_iva),
      preco: safeNumber(d.valor),
      retencao: 0,
      incidencia: safeNumber(d.incidencia),
      valorDesconto: safeNumber(d.desconto),
      descontoProduto: safeNumber(d.desconto),
      mes: d.mes ?? null,
      multa: safeNumber(d.multa),
      mesTempId: d.mes_temp_id ?? undefined,
      codigo_anoLectivo: safeNumber(d.ano_lectivo),
      estado: 0,
      valorPago: 0,
      valorATransportar: 0,
    }));
  }

  private mapServicosParaItens(itensServicos: ServicoItemDto[]): InvoiceItemDto[] {
    return itensServicos.map(d => ({
      CodigoProduto: safeNumber(d.codidigo_servico),
      Quantidade: 1,
      Total: safeNumber(d.total),
      obs: (d.servico || d.obs)
        ? `${d.servico ?? 'Serviço/Taxa'}: ${d.obs ?? d.servico}`.substring(0, 45)
        : '',
      taxaIva: safeNumber(d.multa),
      valorIva: safeNumber(d.valor_iva),
      preco: safeNumber(d.valor),
      retencao: 0,
      incidencia: safeNumber(d.incidencia),
      valorDesconto: safeNumber(d.desconto),
      descontoProduto: safeNumber(d.desconto),
      multa: safeNumber(d.multa),
      codigo_anoLectivo: safeNumber(d.ano_lectivo),
      estado: 0,
      valorPago: 0,
      valorATransportar: 0,
    }));
  }

  private async getAlunoPorMatricula(codigo_matricula: number): Promise<AlunoInfo | null> {
    const sql = `
        SELECT 
            m.Codigo AS matricula,
            pre.Codigo AS codigo_inscricao,
            pre.AlunoCacuaco AS alunoCacuaco,
            pre.desconto AS desconto,
            pre.polo_id AS polo_id,
            pre.codigo_tipo_candidatura AS codigoTipoCandidatura
            FROM fk2_tb_matriculas m
            INNER JOIN fk2_tb_cursos        c ON c.codigo = m.codigo_curso
            INNER JOIN fk2_tb_admissao      a ON a.codigo = m.codigo_aluno
            INNER JOIN fk2_tb_preinscricao  pre ON pre.codigo = a.pre_incricao
            WHERE m.Codigo =:codigo_matricula
            FETCH FIRST 1 ROWS ONLY
    `;

    const raw = await this.dataSource.query(sql, { codigo_matricula } as any);

    if (!raw || raw.length === 0) return null;

    const result = raw[0];

    return toLowerCaseKeys(result);
  }

}
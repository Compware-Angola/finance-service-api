// debt-negotiation.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In as TypeOrmIn, DeepPartial } from 'typeorm';
import { randomInt } from 'crypto';
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

@Injectable()
export class CreateDebtNegotiationService {
      private readonly logger = new Logger(CreateDebtNegotiationService.name);
  private anoAtualPrincipal: any;

  constructor(
    private readonly anoLectivoUtil: AnoLectivoUtil,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(TbPreinscricao) private preinscricaoRepo: Repository<TbPreinscricao>,
    @InjectRepository(TbMatricula) private matriculaRepo: Repository<TbMatricula>,
    @InjectRepository(TbAdmissao) private admissaoRepo: Repository<TbAdmissao>,
    @InjectRepository(AcademicYear) private academicYearRepo: Repository<AcademicYear>,
    @InjectRepository(DebtNegotiation) private negotiationRepo: Repository<DebtNegotiation>,
    @InjectRepository(InscricaoAvaliacao) private avaliacaoRepo: Repository<InscricaoAvaliacao>,
    private dataSource: DataSource,
    private readonly invoiceService: InvoiceService,
  ) { this.initAnoAtual(); InvoiceItem.setRepository(this.invoiceItemRepo); DebtNegotiation.setRepository(this.negotiationRepo) }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }


async createDebtNegotiation(
  dto: CreateDebtNegotiationDto,
  codigo_matricula: any,
) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Buscar aluno
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    if (!aluno) throw new BadRequestException('Matrícula não encontrada');

    // 2. Ano letivo atual
    const anoLectivo = await this.academicYearRepo.findOne({
      where: { Codigo: this.anoAtualPrincipal },
    });
    if (!anoLectivo) throw new BadRequestException('Ano letivo não encontrado');

    // 3. Verificar se já existe negociação neste ano
    const hasNegotiation = await this.negotiationRepo.findOne({
      where: {
        codigo_matricula: aluno.matricula,
        codigo_ano_lectivo: this.anoAtualPrincipal,
      },
    });

    if (hasNegotiation) {
      throw new BadRequestException(
        `Aluno ${aluno.matricula} já possui negociação no ano letivo ${anoLectivo.Designacao}`,
      );
    }

    // Itens da dívida (ambos os tipos)
    const itensMensalidades = dto.fatura_item_mensalidades || [];
    const itensServicos = dto.fatura_item_servicos || [];

    let valorApagar = dto.totalDivida ?? 0;
    const saldo_reset = dto.saldo_reset || 0;
    const valorOriginal = dto.totalDivida ?? 0;
    valorApagar = valorOriginal;

    // 4. Aplicar saldo reset (se < 50%)
    if (saldo_reset > 0 && saldo_reset < valorApagar / 2) {
      valorApagar -= saldo_reset;
      await queryRunner.manager.update(
        TbPreinscricao,
        { Codigo: aluno.codigo_inscricao },
        { saldo_reset: 0, saldo_reset_anter: saldo_reset },
      );
    }

    // 5. Determinar tipo de negociação
    const isTotal = dto.tipoPagamento === 'TOTAL';
    const tipo_negociacao_id = isTotal ? 2 : 1;

    // 6. Validação e cálculo dos 50%
    let primeiroValorApagar: number;
    let valorRestante: number = 0;

    if (isTotal) {
      primeiroValorApagar = parseFloat(valorApagar.toFixed(2));
    } else {
      const metadeOriginal = parseFloat((valorOriginal / 2).toFixed(2));
      const pagoNaHora = parseFloat((dto.valor_pago_na_hora || 0).toFixed(2));

      if (pagoNaHora !== metadeOriginal) {
        throw new BadRequestException(
          `Para negociação parcelada, o valor pago na hora deve ser exatamente ${metadeOriginal} (50% da dívida original: ${valorOriginal}). Recebido: ${pagoNaHora}.`,
        );
      }

      primeiroValorApagar = parseFloat((metadeOriginal - saldo_reset).toFixed(2));
      valorRestante = parseFloat(metadeOriginal.toFixed(2));
    }

    const dataISO = new Date().toISOString();

    const baseInvoiceDto: Partial<CreateInvoiceDto> = {
      DataFactura: dataISO,
      polo_id: aluno.polo_id || 1,
      TotalPreco: 0, // será sobrescrito ou recalculado no service
      codigo_descricao: 5,
      ValorAPagar: 0,
      Descricao: '',
      tipo_documento_factura_id: 2,
      Desconto: dto.desconto || 0,
      totalIVA: dto.totalIVA || 0,
      total_incidencia: dto.total_incidencia || 0,
      total_retencao: dto.total_retencao || 0,
      TotalMulta: [...itensMensalidades, ...itensServicos].reduce((s, d) => s + (d.multa || 0), 0),
      canal: 1,
      CodigoMatricula: aluno.matricula,
      codigo_preinscricao: aluno.codigo_inscricao,
    };

    // =============================================
    // Montar TODOS os itens (mensalidades + serviços) num único array
    // =============================================
    const todosItens: InvoiceItemDto[] = [];


// A. Itens de mensalidades
itensMensalidades.forEach((d) => {
  todosItens.push({
    CodigoProduto: d.codigo_propina ?? null, // ou safeNumber se for número
    Quantidade: 1,
    Total: safeNumber(d.total),
    obs: d.mes_propina 
      ? `Mensalidade de ${d.mes_propina}`.substring(0, 45) 
      : (d.servico ? `Mensalidade/Serviço: ${d.servico}`.substring(0, 45) : ""),
    taxaIva: safeNumber(d.taxa_multa),
    valorIva: safeNumber(d.valor_iva),
    preco: safeNumber(d.valor),
    retencao: 0,
    incidencia: safeNumber(d.incidencia),
    valorDesconto: safeNumber(d.desconto),
    descontoProduto: safeNumber(d.taxa_desconto),
    mes: d.mes_propina ?? null,
    multa: safeNumber(d.multa),
    mesTempId: d.mes_temp_id ?? undefined, // se for número, use safeNumber(d.mes_temp_id, undefined)
    
    estado: 0,
    valorPago: 0,
    valorATransportar: 0, // ou safeNumber(d.valorATransportar, 0).toString() se vier string
  });
});

// B. Itens de serviços/outros
itensServicos.forEach((d) => {
  todosItens.push({
    CodigoProduto: safeNumber(d.codidigo_servico) ,
    Quantidade: 1,
    Total: safeNumber(d.total),
    obs: d.servico || d.taxa_descricao 
      ? `${d.servico || 'Serviço/Taxa'}: ${d.taxa_descricao || d.servico}`.substring(0, 45) 
      : "",
    taxaIva: safeNumber(d.taxa_multa),
    valorIva: safeNumber(d.valor_iva),
    preco: safeNumber(d.valor),
    retencao: 0,
    incidencia: safeNumber(d.incidencia),
    valorDesconto: safeNumber(d.desconto),
    descontoProduto: safeNumber(d.taxa_desconto),
    mes: d.mes_propina ?? null,
    multa: safeNumber(d.multa),
    mesTempId: d.mes_temp_id ?? undefined,
    
    estado: 0,
    valorPago: 0,
    valorATransportar: 0,
  });
});
    // =============================================
    // 7. CRIAR FATURA 1 - ENTRADA (com todos os itens)
    // =============================================
    const faturaEntrada = await this.invoiceService.create({
      ...baseInvoiceDto,
      Descricao: isTotal
        ? 'Negociação de Dívida - Pagamento Total'
        : 'Negociação de Dívida - Entrada 50%',
      TotalPreco: primeiroValorApagar,
      ValorAPagar: primeiroValorApagar,
      itens: todosItens,  // Todos os itens (mensalidades + serviços) aqui!
    } as CreateInvoiceDto);

    // =============================================
    // 8. CRIAR FATURA 2 - SALDO RESTANTE (se parcelado)
    // =============================================
    let faturaSaldo: Invoice | null = null;
    if (!isTotal && valorRestante > 0) {
      // Por enquanto sem itens (pode ser uma fatura "resumo" ou futura)
      // Se quiseres dividir os itens restantes aqui, cria outra lógica de mapeamento
      const itensParaSaldo: InvoiceItemDto[] = [];

      faturaSaldo = await this.invoiceService.create({
        ...baseInvoiceDto,
        Descricao: 'Negociação de Dívida - Saldo Restante (Parcelado)',
        TotalPreco: valorRestante,
        ValorAPagar: valorRestante,
        itens: todosItens,
        // dataVencimento: ... (opcional)
      } as CreateInvoiceDto);
    }

    // =============================================
    // 9. Atualizar faturas antigas (anular e redirecionar)
    // =============================================
    const codigosAntigos = [
      ...itensMensalidades.map(d => d.codFacturaOutrosServicos),
      ...itensServicos.map(d => d.codFacturaOutrosServicos),
    ].filter(Boolean);

    if (codigosAntigos.length > 0) {
      await queryRunner.manager.update(
        Invoice,
        { Codigo: TypeOrmIn(codigosAntigos) },
        { estado: 3 }, // anulada
      );

      await queryRunner.manager.update(
        InscricaoAvaliacao,
        { codigo_factura: TypeOrmIn(codigosAntigos) },
        { codigo_factura: faturaEntrada.Codigo },
      );
    }

    // =============================================
    // 10. Cálculo para prestações mensais (mantido apenas para mensalidades)
    // =============================================
    const mesesComPropina = itensMensalidades.filter((d) => d.mes_propina);
    const qtd_meses = mesesComPropina.length;
    const totalItensMensal = mesesComPropina.reduce((s, d) => s + Number(d.total ?? 0), 0);
    const valorPrestacaoMensal = qtd_meses > 0 ? totalItensMensal / qtd_meses : 0;

    // =============================================
    // 11. Criar a negociação
    // =============================================
    const negociacao = queryRunner.manager.create(DebtNegotiation, {
      valor_divida: parseFloat(valorApagar.toFixed(2)),
      primeiroValorApagar: parseFloat(primeiroValorApagar.toFixed(2)),
      codigo_matricula: aluno.matricula,
      codigo_ano_lectivo: anoLectivo.Codigo,
      codigo_fatura: faturaEntrada.Codigo,
      valorRestante: parseFloat(valorRestante.toFixed(2)),
      qtd_prestacoes: qtd_meses,
      tipo_negociacao_id: tipo_negociacao_id,
      valorPrestacoes: parseFloat(valorPrestacaoMensal.toFixed(2)),
      id_mes_inicial: 0,
      id_mes_final: 0,
      mesesQuitar: 0,
      mesesParImpar: '',
      estado: 1,
    } as DeepPartial<DebtNegotiation>);

    await queryRunner.manager.save(negociacao);

    // =============================================
    // Commit e retorno
    // =============================================
    await queryRunner.commitTransaction();

    return {
      mensagem: 'Negociação criada com sucesso',
      fatura_entrada_id: faturaEntrada.Codigo,
      fatura_saldo_id: faturaSaldo ? faturaSaldo.Codigo : null,
      tipo: isTotal ? 'TOTAL' : 'PARCELADO',
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Erro na negociação de dívida', error?.stack || error);
    throw error instanceof BadRequestException
      ? error
      : new BadRequestException(error.message || 'Erro ao processar negociação de dívida');
  } finally {
    await queryRunner.release();
  }
}

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================




  private async getAlunoPorMatricula(codigo_matricula: number): Promise<{
    matricula: number;
    codigo_inscricao: number;
    alunoCacuaco: number;
    desconto: number;
    codigoTipoCandidatura: number;
    polo_id: number;
  } | null> {
    const raw = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo AS m_codigo',
        'pre.Codigo AS pre_codigo',
        'pre.AlunoCacuaco AS pre_alunocacuaco',
        'pre.desconto AS pre_desconto',
        'pre.polo_id',
        'pre.codigo_tipo_candidatura AS pre_codigo_tipo_candidatura',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .where('m.Codigo = :codigo', { codigo: codigo_matricula })
      .getRawOne();
    console.log(raw);


    if (!raw) return null;

    return {
      matricula: Number(raw.M_CODIGO),
      polo_id: Number(raw.polo_id),
      codigo_inscricao: Number(raw.PRE_CODIGO),
      alunoCacuaco: raw.PRE_ALUNOCACUACO,
      desconto: Number(raw.PRE_DESCONTO),
      codigoTipoCandidatura: Number(raw.PRE_CODIGO_TIPO_CANDIDATURA),
    };
  }
}
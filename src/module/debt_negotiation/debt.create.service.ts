// debt-negotiation.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
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

@Injectable()
export class CreateDebtNegotiationService {
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
      const HasNegotiation = await this.negotiationRepo.findOne({
        where: {
          codigo_matricula: aluno.matricula,
          codigo_ano_lectivo: this.anoAtualPrincipal,
        },
      });
      if (HasNegotiation) {
        throw new BadRequestException(
          `Aluno ${aluno.matricula} já possui negociação no ano letivo ${anoLectivo.Designacao}`,
        );
      }

      // Itens da dívida
      const itensOutrosServicos = dto.fatura_item_servicos || [];
      const itensMensal = dto.fatura_item_mensalidades || [];

      let valorApagar = dto.totalDivida;
      const saldo_reset = dto.saldo_reset || 0;


      const valorOriginal = dto.totalDivida; // dívida sem saldo_reset
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
      const tipo_negociacao_id = isTotal ? 2 : 1; // 2 = Total, 1 = Parcelado

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

        // Ajusta primeiro valor e restante considerando saldo_reset
        primeiroValorApagar = parseFloat((metadeOriginal - saldo_reset).toFixed(2));
        valorRestante = parseFloat((metadeOriginal).toFixed(2));
      }

      const dataISO = new Date().toISOString();

    

      const baseInvoiceDto: Partial<CreateInvoiceDto> = {
        DataFactura: dataISO,
        polo_id: aluno.polo_id || 1,
        TotalPreco: 0, // será sobrescrito
        codigo_descricao: 5,
        ValorAPagar: 0, // será sobrescrito
        Descricao: '', // será sobrescrito
        tipo_documento_factura_id: 2,
        Desconto: dto.desconto || 0,
        totalIVA: dto.totalIVA || 0,
        total_incidencia: dto.total_incidencia || 0,
        total_retencao: dto.total_retencao || 0,
        TotalMulta: itensMensal.reduce((s, d) => s + (d.multa || 0), 0),
        canal: 1,
        CodigoMatricula: aluno.matricula,
        codigo_preinscricao: aluno.codigo_inscricao,
      };

      // =============================================
      // 7. CRIAR FATURA 1 - ENTRADA (50% ou 100%)
      // =============================================
      const faturaEntrada = await this.invoiceService.create({
        ...baseInvoiceDto,
        Descricao: isTotal
          ? 'Renegociação de Dívida - Pagamento Total'
          : 'Renegociação de Dívida - Entrada 50%',
        TotalPreco: primeiroValorApagar,
        ValorAPagar: primeiroValorApagar,

      } as CreateInvoiceDto);

      // =============================================
      // 8. CRIAR FATURA 2 - SALDO RESTANTE (só se parcelado)
      // =============================================
      let faturaSaldo: any = null;
      if (!isTotal && valorRestante > 0) {
        faturaSaldo = await this.invoiceService.create({
          ...baseInvoiceDto,
          Descricao: 'Renegociação de Dívida - Saldo Restante (Parcelado)',
          TotalPreco: valorRestante,
          ValorAPagar: valorRestante,
          // Opcional: definir vencimento futuro
          // DataVencimento: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        } as CreateInvoiceDto);
      }

      // =============================================
      // 9. Atualizar faturas antigas (anular e redirecionar)
      // =============================================
      const codigosAntigos = itensOutrosServicos
        .map((d) => d.codFacturaOutrosServicos)
        .filter(Boolean);

      if (codigosAntigos.length > 0) {
        await queryRunner.manager.update(
          Invoice,
          { Codigo: TypeOrmIn(codigosAntigos) },
          { estado: 3 }, // 3 = anulada/cancelada
        );

        await queryRunner.manager.update(
          InscricaoAvaliacao,
          { codigo_factura: TypeOrmIn(codigosAntigos) },
          { codigo_factura: faturaEntrada.Codigo },
        );
      }

      // =============================================
      // 10. Criar itens de mensalidade na fatura de entrada
      // =============================================
      if (itensMensal.length > 0) {

        // 1. Buscar o último código existente
        const ultimoItem = await queryRunner.manager
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

        // TIPAGEM CORRETA
        const invoiceItems: InvoiceItem[] = [];

        // 2. Criar items
        for (let i = 0; i < itensMensal.length; i++) {
          const d = itensMensal[i];

          ultimoNumero += 1;
          const codigoGerado = ultimoNumero;

          const item = new InvoiceItem();

          Object.assign(item, {
            codigo: codigoGerado,
            CodigoProduto: d.codigo_propina,
            CodigoFactura: faturaEntrada.Codigo,
            quantidade: 1,
            total: d.total,
            obs: d.mes_propina ? `Mensalidade de ${d.mes_propina}` : null,
            taxaIva: Number(d.taxa_multa ?? 0),
            valorIva: Number(d.valor_iva ?? 0),
            preco: d.valor ?? 0,
            retencao: 0,
            incidencia: Number(d.incidencia ?? 0),
            valorDesconto: 0,
            descontoProduto: 0,
            mes: d.mes_propina ?? null,
            multa: d.multa ?? 0,
            mesTempId: d.mes_temp_id ?? null,
            codigoAnoLectivo: d.codigo_anoLectivo ?? null,
            estado: 0,
            valorPago: 0,
            valorATransportar: '0',
          });

          invoiceItems.push(item);
        }

        await queryRunner.manager.save(invoiceItems);
      }




      // =============================================
      // 11. Cálculo para prestações mensais
      // =============================================
      const mesesComPropina = itensMensal.filter((d) => d.mes_propina);
      const qtd_meses = mesesComPropina.length;
      const totalItensMensal = mesesComPropina.reduce((s, d) => s + d.total, 0);
      const valorPrestacaoMensal = qtd_meses > 0 ? totalItensMensal / qtd_meses : 0;

      // =============================================
      // 12. Criar a negociação (com as duas faturas)
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

        // Campos que causam DEFAULT → enviar explicitamente null (ou número)
        id_mes_inicial: 0,
        id_mes_final: 0,
        mesesQuitar: 0,
        mesesParImpar: '',
        estado: 1
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
      console.error('Erro na negociação:', error);
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
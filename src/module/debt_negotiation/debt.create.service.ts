// debt-negotiation.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In as TypeOrmIn } from 'typeorm';
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
  ) { this.initAnoAtual(); InvoiceItem.setRepository(this.invoiceItemRepo) ;DebtNegotiation.setRepository(this.negotiationRepo)}
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

      const anoLectivo = await this.academicYearRepo.findOne({
        where: { Codigo: this.anoAtualPrincipal },
      });
      if (!anoLectivo) throw new BadRequestException('Ano letivo não encontrado');


      const HasNegotation = await this.negotiationRepo.findOne({
        where: { codigo_matricula: aluno.matricula.toString(), codigo_ano_lectivo: this.anoAtualPrincipal },
      });

      if (HasNegotation) throw new BadRequestException(`Aluno ${aluno.matricula}" já possui negociação Neste Ano Lectivo ${anoLectivo.Designacao}`)


      // 2. Ano letivo

      const itensOutrosServicos = dto.fatura_item_servicos;
      const itensMensal = dto.fatura_item_mensalidades
      let valorApagar = dto.totalDivida;
      const saldo_reset = dto.saldo_reset || 0;

      // 3. Aplicar saldo reset (se < 50%)
      if (saldo_reset > 0 && saldo_reset < valorApagar / 2) {
        valorApagar = valorApagar - saldo_reset;
        await queryRunner.manager.update(
          TbPreinscricao,
          { Codigo: aluno.codigo_inscricao },
          { saldo_reset: 0, saldo_reset_anter: saldo_reset },
        );
      }
      // 4. Determinar tipo
      const isTotal = dto.tipoPagamento === 'TOTAL';
      const tipo_negociacao_id = isTotal ? 2 : 1;
      // 5. VALIDAÇÃO 50% (PARCELADO)
      let primeiroValorApagar: number;
      let valorRestante: number;

      if (isTotal) {
        primeiroValorApagar = parseFloat(valorApagar.toFixed(2));
        valorRestante = 0;
      } else {
        const metadeExata = parseFloat((valorApagar / 2).toFixed(2));
        const pagoNaHora = parseFloat((dto.valor_pago_na_hora || 0).toFixed(2));

        if (pagoNaHora !== metadeExata) {
          throw new BadRequestException(
            `Para negociação 50%, "o" valor pago na hora deve ser exatamente ${metadeExata} (50% de ${valorApagar}). Recebido: ${pagoNaHora}.`,
          );
        }

        primeiroValorApagar = metadeExata;
        valorRestante = metadeExata;
      }

      // 6. Gerar numeração + hash

      const dataAtual = new Date();
      const dataISO = dataAtual.toISOString();

      // 7. Criar fatura com queryRunner
      const createInvoiceDto: CreateInvoiceDto = {
        DataFactura: dataISO,
        polo_id: aluno.polo_id,
        TotalPreco: dto.precoTotal,
        codigo_descricao: 5,
        ValorAPagar: primeiroValorApagar,
        Descricao: 'Renegociação de Dívidas',
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



      const invoice = await this.invoiceService.create(createInvoiceDto);

      // 8. Atualizar faturas antigas
      const codigosAntigos = itensOutrosServicos
        .map(d => d.codFacturaOutrosServicos)
        .filter(Boolean);

      if (codigosAntigos.length > 0) {
        await queryRunner.manager.update(Invoice, { Codigo: TypeOrmIn(codigosAntigos) }, { estado: 3 });
        await queryRunner.manager.update(
          InscricaoAvaliacao,
          { codigo_factura: TypeOrmIn(codigosAntigos) },
          { codigo_factura: invoice.Codigo },
        );
      }

if (Array.isArray(itensMensal) && itensMensal.length > 0) {
  const em = queryRunner.manager;

  const invoiceItems = itensMensal.map(d => {
    const item = new InvoiceItem();
    Object.assign(item, {
      CodigoProduto: String(d.codigo_propina),
      CodigoFactura: String(invoice.Codigo),
      quantidade: 1,
      total: d.total,
      obs: d.mes_propina ? `Mensalidade de ${d.mes_propina}`.trim() : null,
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
    return item;
  });

  await em.save(invoiceItems);
}

      // 10. Cálculo de prestações
      const mesesComPropina = itensMensal.filter(d => d.mes_propina);
      const qtd_meses = mesesComPropina.length;
      const totalItens = mesesComPropina.reduce((s, d) => s + d.total, 0);
      const valorPM = qtd_meses > 0 ? totalItens / qtd_meses : 0;

      // 11. Criar negociação
      const negociacao = queryRunner.manager.create(DebtNegotiation, {
        valor_divida: parseFloat(valorApagar.toFixed(2)).toString(),
        primeiroValorApagar: primeiroValorApagar.toString(),
        codigo_matricula: aluno.matricula.toString(),
        codigo_ano_lectivo: anoLectivo.Codigo.toString(),
        codigo_fatura: invoice.Codigo.toString(), 
        valorRestante: valorRestante.toString(),
        qtd_prestacoes: qtd_meses.toString(),
        tipo_negociacao_id: tipo_negociacao_id.toString(),
        valorPrestacoes: parseFloat(valorPM.toFixed(2)).toString(),
      });

      const aaa = await queryRunner.manager.save(negociacao);
      console.log(aaa);


      await queryRunner.commitTransaction();
      return { last_fatura_id: invoice.Codigo };
    } catch (error) {
      console.log(error);

      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException(error.message || 'Erro ao processar negociação');
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
  polo_id:number;
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

  if (!raw) return null;
 
  return {
    matricula: Number(raw.M_CODIGO),
    polo_id:Number(raw.POLO_ID),
    codigo_inscricao: Number(raw.PRE_CODIGO),
    alunoCacuaco: raw.PRE_ALUNOCACUACO,
    desconto: Number(raw.PRE_DESCONTO),
    codigoTipoCandidatura: Number(raw.PRE_CODIGO_TIPO_CANDIDATURA),
  };
}
}
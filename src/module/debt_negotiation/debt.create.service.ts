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
  private anoAtualPrincipal: number;

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
  ) { this.initAnoAtual(); }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }


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

      const anoLectivo = await this.academicYearRepo.findOne({
        where: { Codigo: this.anoAtualPrincipal },
      });
      if (!anoLectivo) throw new BadRequestException('Ano letivo não encontrado');


      const HasNegotation = await this.negotiationRepo.findOne({
        where: { codigo_matricula: aluno.matricula, "codigo_ano_lectivo": this.anoAtualPrincipal },
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
          { saldo_reset: 0, "saldo_reset_anter": saldo_reset },
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

      // 9. Inserir itens
      const invoiceItems = itensMensal.map(d => ({
        codigoProduto: d.codigo_propina,
        codigoFactura: invoice.Codigo,
        quantidade: 1,
        total: d.total,
        obs: `Mensalidade de ${d.mes_propina || ''}`.trim(),
        taxaIva: d.taxa_multa || 0,
        valorIva: d.valor_iva || 0,
        preco: Number(d.valor) || 0,
        retencao: 0,
        incidencia: d.incidencia || 0,
        valorDesconto: 0,
        descontoProduto: 0,
        mes: d.mes_propina || '',
        multa: d.multa || 0,
        mesTempId: d.mes_temp_id,
        codigoAnoLectivo: d.codigo_anoLectivo,
        estado: 0,
        valorPago: 0,
        valorATransportar: 0,
      }));

      await queryRunner.manager.insert(InvoiceItem, invoiceItems);



      // 10. Cálculo de prestações
      const mesesComPropina = itensMensal.filter(d => d.mes_propina);
      const qtd_meses = mesesComPropina.length;
      const totalItens = mesesComPropina.reduce((s, d) => s + d.total, 0);
      const valorPM = qtd_meses > 0 ? totalItens / qtd_meses : 0;

      // 11. Criar negociação
      const negociacao = queryRunner.manager.create(DebtNegotiation, {
        valor_divida: parseFloat(valorApagar.toFixed(2)),
        primeiroValorApagar,
        codigo_matricula: aluno.matricula,
        codigo_ano_lectivo: anoLectivo.Codigo,
        codigo_fatura: invoice.Codigo,
        valorRestante,
        qtd_prestacoes: qtd_meses,
        tipo_negociacao_id,
        valor_prestacao_mensal: parseFloat(valorPM.toFixed(2)),
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


  private async getAlunoPorMatricula(codigo_matricula: number): Promise<any> {
    const [result] = await this.matriculaRepo.query(
      `
      SELECT 
        m.Codigo AS matricula,
        pre.Codigo AS codigo_inscricao,
        pre.polo_id
      FROM "DBUMA"."UMA_TB_MATRICULAS" m
      INNER JOIN tb_admissao a ON a.codigo = m.Codigo_Aluno
      INNER JOIN tb_preinscricao pre ON pre.Codigo = a.pre_incricao
      WHERE "m".Codigo = ?
      LIMIT 1
    `,
      [codigo_matricula],
    );
    return result || null;
  }
}
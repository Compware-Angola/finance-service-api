import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Raw, DataSource } from 'typeorm';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';
import { InscricaoAvaliacao } from './entities/inscricao-avaliacao.entity';
import { MesTemp } from './entities/mes-temp.entity';
import { MotivoIsencaoIva } from './entities/motivo-isencao-iva.entity';
import { TbAdmissao } from './entities/tb-admissao.entity';
import { TbBolseiroSiiuma } from './entities/tb-bolseiro-siiuma.entity';
import { TbConfirmacao } from './entities/tb-confirmacao.entity';
import { TbCurso } from './entities/tb-curso.entity';
import { TbDisciplina } from './entities/tb-disciplina.entity';
import { TbGradeCurricular } from './entities/tb-grade-curricular.entity';
import { TbInscricaoAnoAnterior } from './entities/tb-inscricao-ano-anterior.entity';
import { TbMatricula } from './entities/tb-matricula.entity';
import { TbPagamentosi } from './entities/tb-pagamentosi.entity';
import { TbTipoServico } from './entities/tb-tipo-servico.entity';
import { TipoTaxa } from './entities/tipo-taxa.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/InvoiceIten.entity';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { Parametro } from './entities/parametro.entity';
import { MesCalendario } from './entities/mes-calendario.entity';
import { Empresa } from './entities/empresa.entity';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { MesesPagarService } from './meses-pagar.service';
import { PropinaAlunoService } from './propina-aluno.service';
import { sumValues } from '../util/currency.util';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

export interface DividaDto {
  codGradeCurricular: string | null;
  codFacturaOutrosServicos: string | null;
  valor: number;
  multa: number;
  total: number;
  servico: string;
  mes_propina: string;
  mes_temp_id: number | null;
  n_prestacao: string | null;
  ano_lectivo: string;
  taxa_multa: number;
  taxa_desconto: number;
  bolsa: string | null;
  codigo_propina: string;
  codigo_anoLectivo: number;
  desconto: number;
  incidencia: number;
  valor_iva: number;
  tipo_taxas: number;
  taxa_descricao: string | null;
  codidigo_servico?: number
}

@Injectable()
export class DebtNegotiationService {
  private anoAtualPrincipal: number;
  constructor(
    private readonly anoLectivoUtil: AnoLectivoUtil,
    private readonly mesesPagarService: MesesPagarService,
    private readonly propinaAlunoService: PropinaAlunoService,
    @InjectRepository(TbPreinscricao) private preinscricaoRepo: Repository<TbPreinscricao>,
    @InjectRepository(Payment) private pagamentoRepo: Repository<Payment>,
    @InjectRepository(TbPagamentosi) private pagamentosiRepo: Repository<TbPagamentosi>,
    @InjectRepository(Invoice) private facturaRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private facturaItemRepo: Repository<InvoiceItem>,
    @InjectRepository(TbTipoServico) private tipoServicoRepo: Repository<TbTipoServico>,
    @InjectRepository(TbMatricula) private matriculaRepo: Repository<TbMatricula>,
    @InjectRepository(TbAdmissao) private admissaoRepo: Repository<TbAdmissao>,
    @InjectRepository(TbCurso) private cursoRepo: Repository<TbCurso>,
    @InjectRepository(AcademicYear) private anoLectivoRepo: Repository<AcademicYear>,
    @InjectRepository(TbInscricaoAnoAnterior) private inscricaoAnteriorRepo: Repository<TbInscricaoAnoAnterior>,
    @InjectRepository(TbConfirmacao) private confirmacaoRepo: Repository<TbConfirmacao>,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,
    @InjectRepository(TbBolseiroSiiuma) private bolseiroRepo: Repository<TbBolseiroSiiuma>,
    @InjectRepository(InscricaoAvaliacao) private avaliacaoRepo: Repository<InscricaoAvaliacao>,
    @InjectRepository(TbGradeCurricular) private gradeRepo: Repository<TbGradeCurricular>,
    @InjectRepository(TbDisciplina) private disciplinaRepo: Repository<TbDisciplina>,
    @InjectRepository(TipoTaxa) private tipoTaxaRepo: Repository<TipoTaxa>,
    @InjectRepository(MotivoIsencaoIva) private motivoIvaRepo: Repository<MotivoIsencaoIva>,

    // === NOVAS DEPENDÊNCIAS INJETADAS ===

    private dataSource: DataSource,
    @InjectRepository(MesCalendario) private mesCalendarioRepo: Repository<MesCalendario>,
    @InjectRepository(Parametro) private parametroRepo: Repository<Parametro>,
    @InjectRepository(Empresa) private empresaRepo: Repository<Empresa>,

  ) { this.initAnoAtual(); }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }


  // === 1. pagouOutubro ===
  async pagouOutubro(codigo_inscricao: number): Promise<boolean> {
   
    
    const raw = await this.pagamentoRepo
      .createQueryBuilder('p')
      .select('pi.mes_temp_id')
      .innerJoin('UMA_TB_PAGAMENTOSI', 'pi', 'pi.Codigo_Pagamento = p.Codigo')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = p.Codigo_PreInscricao')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = p.codigo_factura')
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
      .innerJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'ts.Codigo = fi.CodigoProduto')
      .where('pre.Codigo = :codigo', { codigo: codigo_inscricao })
      .andWhere(
        `CASE 
           WHEN REGEXP_LIKE(TRIM(p.AnoLectivo), '^[0-9]+$') 
           THEN TO_NUMBER(TRIM(p.AnoLectivo)) 
           ELSE NULL 
         END = :ano`,
        { ano: 1 }
      )
      .andWhere(
        `CASE 
           WHEN REGEXP_LIKE(TRIM(pi.mes_temp_id), '^[0-9]+$') 
           THEN TO_NUMBER(TRIM(pi.mes_temp_id)) 
           ELSE NULL 
         END = 5`
      )
      .andWhere('f.estado != 3')
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .andWhere('p.estado = 1')
      .getRawOne();

    return !!raw?.mes_temp_id;
  }

  // === 2. dividaOutrosServicos ===
  async dividaOutrosServicos(codigo_matricula: number, ano_lectivo?: number): Promise<DividaDto[]> {
    const dividas: DividaDto[] = [];

    // 1. Pega o aluno
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    if (!aluno?.codigoInscricao) return [];

    // 2. Confirmação + pagamento de outubro em paralelo
    const [confirmacao, pagamentoOutubro] = await Promise.all([
      this.confirmacao(codigo_matricula, ano_lectivo),
      this.pagouOutubro(aluno.codigoInscricao),
    ]);

    const cond1 = confirmacao?.ultimoAnoInscritoId === 1 && pagamentoOutubro;
    const cond2 =
      confirmacao?.ultimoAnoInscritoId !== 1 &&
      !(parseInt(confirmacao?.ultimoAnoInscritoDesig || '0') <= 2019);

    if (!cond1 && !cond2) return [];

    const anoLectivoId = ano_lectivo ?? confirmacao!.ultimoAnoInscritoId.toString();

    // 3. Faturas de avaliação já pagas (excluir)
    const faturasPagasRaw = await this.facturaRepo
      .createQueryBuilder('f')
      .select('DISTINCT ia.codigo_factura', 'codigo_factura')
      .innerJoin('UMA_INSCRICAO_AVALIACOES', 'ia', 'ia.codigo_factura = f.Codigo')
      .innerJoin('UMA_TB_MATRICULAS', 'm', 'm.Codigo = f.CodigoMatricula')
      .innerJoin('UMA_TB_PAGAMENTOS', 'p', 'p.codigo_factura = f.Codigo')
      .where('ia.codigo_ano_lectivo = :ano', { ano: anoLectivoId })
      .andWhere('f.corrente = 1')
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('m.Codigo = :matricula', { matricula: codigo_matricula })
      .getRawMany();

    const faturasPagasIds = faturasPagasRaw.map(r => Number(r.codigo_factura));

    // 4. Outros serviços (com todos os JOINs corretos)
    const query = this.avaliacaoRepo
      .createQueryBuilder('ia')
      .select([
        'f.Codigo AS f_codigo',
        'MAX(f.ValorAPagar) AS f_valorapagar',
        'gc.Codigo AS gc_codigo',
        'MAX(fi.preco) AS fi_preco',
        'MAX(fi.Multa) AS fi_multa',
        'MAX(fi.descontoProduto) AS fi_descontoproduto',
        'MAX(fi.Total) AS fi_total',
        'MAX(d.Designacao) AS d_designacao',
        'MAX(al.Codigo) AS al_codigo',
        'MAX(al.Designacao) AS al_designacao',
        'MAX(ts.Codigo) AS ts_codigo',
        'MAX(fi.incidencia) AS fi_incidencia',
        'MAX(fi.valor_iva) AS fi_valor_iva',
        'MAX(fi.taxa_iva) AS fi_taxa_iva',
        'MAX(tt.descricao) AS tt_descricao',
      ])
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = ia.codigo_factura')
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = f.ano_lectivo')
      .innerJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'ts.Codigo = fi.CodigoProduto')
      .leftJoin('UMA_TIPO_TAXAS', 'tt', 'tt.id = ts.taxa_iva_id')
      .leftJoin('UMA_TB_GRADE_CURRICULAR', 'gc', 'gc.Codigo = ts.codigo_grade_currilular')
      .leftJoin('UMA_TB_DISCIPLINAS', 'd', 'd.Codigo = gc.Codigo_Disciplina')
      .where('ia.codigo_matricula = :matricula', { matricula: codigo_matricula })
      .andWhere('ia.codigo_ano_lectivo = :ano', { ano: anoLectivoId })
      .andWhere('ia.estado != :anulado', { anulado: 'anulado' })
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('f.corrente = 1');

    if (faturasPagasIds.length > 0) {
      query.andWhere('f.Codigo NOT IN (:...excluidos)', { excluidos: faturasPagasIds });
    }

    const outrosServicosRaw = await query
      .groupBy('gc.Codigo, f.Codigo')
      .orderBy('gc.Codigo')
      .getRawMany();

    // 5. Processa cada serviço
    for (const raw of outrosServicosRaw) {
      const codGradeCurricular = raw.gc_codigo;
      let servico = raw.d_designacao || '';

      if (codGradeCurricular) {
        const tipoAvaliacao = await this.avaliacaoRepo.findOne({
          where: {
            codigo_matricula: codigo_matricula.toString(),
            codigo_grade: codGradeCurricular,
            codigo_factura: raw.f_codigo,
          },
          select: ['codigo_tipo_avaliacao'],
        });

        const codigo = Number(tipoAvaliacao?.codigo_tipo_avaliacao);
        if (codigo === 7) servico = 'Rec. ' + servico;
        else if (codigo === 22) servico = 'Melhoria. ' + servico;
        else if (codigo === 11) servico = 'Exame Especial. ' + servico;
      }

      dividas.push({
        codGradeCurricular,
        codFacturaOutrosServicos: raw.f_codigo,
        valor: Number(raw.fi_preco),
        multa: Number(raw.fi_multa),
        total: Number(raw.fi_total),
        servico,
        mes_propina: '',
        mes_temp_id: null,
        n_prestacao: '',
        ano_lectivo: raw.al_designacao,
        taxa_multa: 0,
        codigo_propina: '',
        taxa_desconto: 0,
        bolsa: '',
        codidigo_servico: Number(raw.ts_codigo),
        codigo_anoLectivo: Number(raw.al_codigo),
        desconto: Number(raw.fi_descontoproduto),
        incidencia: Number(raw.fi_incidencia),
        valor_iva: Number(raw.fi_valor_iva),
        tipo_taxas: Number(raw.fi_taxa_iva),
        taxa_descricao: raw.tt_descricao,
      });
    }

    return dividas;
  }

  // === 3. dividasPropinaAnoCorrente ===
  async dividasPropinaAnoCorrente(codigo_matricula: number, pre_inscricaoId: number, ano_lectivo?: number): Promise<DividaDto[]> {
    const dividas: DividaDto[] = [];
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    if (!aluno) return [];

    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: codigo_matricula, estado_matricula: 'diplomado' }
    });
    if (diplomado) return [];

    const confirmacao = await this.confirmacaoAnoCorrente(codigo_matricula, ano_lectivo);
    if (!confirmacao) return [];

    const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao?.ano_lectivo_id, aluno?.codigoInscricao);
    const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao?.ano_lectivo_id, mesesPagos, aluno, codigo_matricula);
    const propina = await this.propinaAlunoService.propinaAluno(aluno.codigoInscricao, aluno.alunoCacuaco.toString(), confirmacao?.ano_lectivo_id, codigo_matricula, aluno);
    if (!propina) return [];

    const bolseiro1 = await this.BolsaPorSemestre1(codigo_matricula, confirmacao?.ano_lectivo_id, 1);
    const bolseiro2 = await this.BolsaPorSemestre2(codigo_matricula, confirmacao?.ano_lectivo_id, 2);

    const taxaMultaMeses = await this.mesesPagarService.mesesPagar(new Date().toISOString().split('T')[0], 1, 0, confirmacao?.ano_lectivo_id, pre_inscricaoId, "null", codigo_matricula);
    const desconto_finalista = await this.pegar_finalista(confirmacao?.ano_lectivo_id, codigo_matricula, pre_inscricaoId);

    // Semestre 1
    if (propina && (!bolseiro1 || (bolseiro1.desconto > 0 && bolseiro1.desconto < 100))) {
      const mes_temp = await this.mesTempRepo.find({ where: { semestre: 1, "activo": 1 } });
      for (const mes of mesesNaoPagos) {
        for (const mes_semestre of mes_temp) {
          if (mes.id === mes_semestre.id && mes.data_final < new Date().toISOString().split('T')[0]) {
            const mesNPago: any = taxaMultaMeses.find(m => m.codigo === mes.id);
            const taxa_multa = mesNPago?.taxa > 0 ? mesNPago.taxa : 0;

            let taxa_desconto = 0;
            let bolsa = '';
            let desconto = 0;
            let valorComDesconto = propina.Preco;
            let multa = 0;
            let total = 0;

            if (bolseiro1 && bolseiro1.desconto !== 100 && bolseiro1.desconto !== 0) {
              taxa_desconto = bolseiro1.desconto;
              bolsa = bolseiro1.tipo_bolsa;
              desconto = propina.Preco * (bolseiro1.desconto / 100);
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (taxa_multa / 100);
              total = valorComDesconto + multa;
            } else if (aluno.desconto > 0) {
              taxa_desconto = aluno.desconto;
              desconto = propina.Preco * (aluno.desconto / 100);
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (taxa_multa / 100);
              total = valorComDesconto + multa;
            } else {
              if (desconto_finalista > 0 && desconto_finalista <= 3) {
                desconto = propina.Preco * 0.5;
                taxa_desconto = 50;
              }
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (taxa_multa / 100);
              total = valorComDesconto + multa;
            }

            dividas.push({
              codGradeCurricular: null,
              codFacturaOutrosServicos: null,
              valor: propina.Preco,
              multa,
              total,
              servico: propina.Descricao,
              mes_propina: mes.designacao,
              mes_temp_id: mes.id,
              n_prestacao: mes.prestacao,
              ano_lectivo: confirmacao?.ano_lectivo_designacao,
              taxa_multa,
              taxa_desconto,
              bolsa,
              codigo_propina: propina.Codigo as any,
              codigo_anoLectivo: confirmacao?.ano_lectivo_id,
              desconto,
              incidencia: propina.Preco - desconto,
              valor_iva: 0,
              tipo_taxas: 0,
              taxa_descricao: null,
            });
          }
        }
      }
    }

    // Semestre 2
    if (propina && (!bolseiro2 || (bolseiro2.desconto > 0 && bolseiro2.desconto < 100))) {
      const mes_temp = await this.mesTempRepo.find({ where: { semestre: 2, "activo": 1 } });
      for (const mes of mesesNaoPagos) {
        for (const mes_semestre of mes_temp) {
          if (mes.id === mes_semestre.id) {
            const mesNPago = taxaMultaMeses.find(m => m.codigo === mes.id);
            if (!mesNPago || mesNPago.taxa <= 0) continue;

            let taxa_desconto = 0;
            let bolsa = '';
            let desconto = 0;
            let valorComDesconto = propina.Preco;
            let multa = 0;
            let total = 0;

            if (bolseiro2 && bolseiro2.desconto !== 100 && bolseiro2.desconto !== 0) {
              taxa_desconto = bolseiro2.desconto;
              bolsa = bolseiro2.tipo_bolsa;
              desconto = propina.Preco * (bolseiro2.desconto / 100);
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (mesNPago.taxa / 100);
              total = valorComDesconto + multa;
            } else if (aluno.desconto > 0) {
              taxa_desconto = aluno.desconto;
              desconto = propina.Preco * (aluno.desconto / 100);
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (mesNPago.taxa / 100);
              total = valorComDesconto + multa;
            } else {
              if (desconto_finalista > 0 && desconto_finalista <= 3) {
                desconto = propina.Preco * 0.5;
                taxa_desconto = 50;
              }
              valorComDesconto = propina.Preco - desconto;
              multa = valorComDesconto * (mesNPago.taxa / 100);
              total = valorComDesconto + multa;
            }

            dividas.push({
              codGradeCurricular: null,
              codFacturaOutrosServicos: null,
              valor: propina.Preco,
              multa,
              total,
              servico: propina.Descricao,
              mes_propina: mesNPago.mes,
              mes_temp_id: mesNPago.codigo,
              n_prestacao: mesNPago.prestacao as any,
              ano_lectivo: confirmacao?.ano_lectivo_designacao,
              taxa_multa: mesNPago.taxa,
              taxa_desconto,
              bolsa,
              codigo_propina: propina.Codigo as any,
              codigo_anoLectivo: confirmacao?.ano_lectivo_id,
              desconto,
              incidencia: propina.Preco - desconto,
              valor_iva: 0,
              tipo_taxas: 0,
              taxa_descricao: null,
            });
          }
        }
      }
    }

    return dividas;
  }

  // === 4. getPrestacoesAnosAnterioresPorAnoLectivo ===
  async getPrestacoesAnosAnterioresPorAnoLectivo(ano_lectivo: number): Promise<number[]> {
    const result = await this.mesTempRepo
      .createQueryBuilder('mt')
      .select('mt.id', 'codigo')
      .where('mt.activo = 1')
      .andWhere('mt.id <= 10')
      .getRawMany();
    return result.map(r => r.codigo);
  }


  // === 6. mesesPagarPropina ===
  async mesesPagarPropina(data: string, tipo: number, mes: number, ano_lectivo: number): Promise<any[]> {
    // Simulação: retorna todos os meses com taxa
    return this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.id as codigo',
        'mt.designacao as mes',
        'mt.prestacao as prestacao',
        '10 as taxa'
      ])
      .where('mt.activo = 1')
      .getRawMany();
  }

  // === 7. dividasNovaVersao ===
  async dividasNovaVersao(codigo_matricula: number, preinscricaoId: number, ano_lectivo?: number): Promise<any[]> {
    let codigo_inscricao = codigo_matricula;
    let user: TbPreinscricao | null = null;

    // 1. Busca usuário
    user = await this.preinscricaoRepo.findOne({ where: { Codigo: preinscricaoId } });

    if (!user || Number(user.codigo_tipo_candidatura) !== 1) {
      return this.handlePosGraduacao(user, codigo_matricula, ano_lectivo);
    }

    // 2. Matrícula + Pré-inscrição
    const matriculaRaw = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo AS codigo',
        'm.Codigo_Aluno AS codigo_aluno',
        'm.estado_matricula AS estado_matricula',
        'pre.Codigo AS codigo_inscricao',
        'pre.AlunoCacuaco AS aluno_cacuaco',
        'pre.desconto AS desconto',
        'pre.codigo_tipo_candidatura AS codigo_tipo_candidatura',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', '"a"."codigo" = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', '"pre"."Codigo" = a.pre_incricao')
      .where('pre.Codigo = :preinscricaoId', { preinscricaoId })
      .orWhere('m.Codigo = :codigo_matricula', { codigo_matricula })
      .limit(1)
      .getRawOne();

    if (!matriculaRaw) return [];

    const matricula = toLowerCaseKeys(matriculaRaw);
    codigo_inscricao = matricula.codigo_inscricao;

    // 3. Curso
    const cursoRaw = await this.cursoRepo
      .createQueryBuilder('c')
      .select([
        'c.Designacao AS curso',
        'c.Codigo AS codigo_curso',
      ])
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Curso_Candidatura = "c"."Codigo"')
      .where('pre.Codigo = :codigo_inscricao', { codigo_inscricao })
      .limit(1)
      .getRawOne();

    const curso = toLowerCaseKeys(cursoRaw) || null;
    const anoCorrente = this.anoAtualPrincipal;
    const anoAtual = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });

    if (!anoAtual) return [];

    // 4. Maior ano anterior (QueryBuilder)
    const maiorAnoRaw = await this.dataSource
      .createQueryBuilder()
      .select('al.Designacao', 'ano_designacao')
      .addSelect('al.Codigo', 'maior')
      .from('UMA_TB_INSCRICOES_ANO_ANTERIOR', 'ia')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = ia.codigo_ano_lectivo')
      .where('ia.codigo_matricula = :matricula', { matricula: matricula.codigo })
      .andWhere('ia.status = 1')
      .orderBy('al.ordem', 'DESC')
      .addOrderBy('al.Designacao', 'DESC')
      .limit(1)
      .getRawOne();

    const maiorAno = toLowerCaseKeys(maiorAnoRaw) || null;

    // 5. Todos os anos anteriores (ou apenas o especificado)
    let anosAnterioresRaw: any[];
    if (ano_lectivo) {
      anosAnterioresRaw = await this.dataSource
        .createQueryBuilder()
        .select('al.Designacao', 'ano_designacao')
        .addSelect('ia.codigo_ano_lectivo', 'ano_lectivo')
        .from('UMA_TB_INSCRICOES_ANO_ANTERIOR', 'ia')
        .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = ia.codigo_ano_lectivo')
        .where('ia.codigo_matricula = :matricula', { matricula: matricula.codigo })
        .andWhere('ia.codigo_ano_lectivo = :ano', { ano: ano_lectivo })
        .orderBy('ia.codigo_ano_lectivo', 'ASC')
        .getRawMany();
    } else {
      anosAnterioresRaw = await this.dataSource
        .createQueryBuilder()
        .select('al.Designacao', 'ano_designacao')
        .addSelect('ia.codigo_ano_lectivo', 'ano_lectivo')
        .from('UMA_TB_INSCRICOES_ANO_ANTERIOR', 'ia')
        .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = ia.codigo_ano_lectivo')
        .where('ia.codigo_matricula = :matricula', { matricula: matricula.codigo })
        .orderBy('ia.codigo_ano_lectivo', 'ASC')
        .getRawMany();
    }

    const collection: any[] = [];
    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: matricula.codigo, estado_matricula: 'diplomado' },
    });

    let bolseiroGlobal: TbBolseiroSiiuma | null = null;
    if (maiorAno?.maior) {
      const anoLectivoBolsa = await this.anoLectivoRepo.findOne({ where: { Codigo: maiorAno.maior } });
      if (anoLectivoBolsa) {
        bolseiroGlobal = await this.bolseiroRepo.findOne({
          where: { codigo_matricula: matricula.codigo, ano: anoLectivoBolsa.Designacao },
        });
      }
    }

    // === DÍVIDAS ANTIGAS (2020+) ===
    for (const aa of anosAnterioresRaw) {
      const ano = toLowerCaseKeys(aa);

      const bolseiro = await this.bolseiroRepo.findOne({
        where: { codigo_matricula: matricula.codigo, ano: ano.ano_designacao },
      });

      const mesesPagos = await this.mesesPagosPorAnoPropina(ano.ano_lectivo, codigo_inscricao);

      const mesesIds = mesesPagos.map(m => m.codigo_mes);
      const mesesIsentos: any = await this.getPrestacoesAnosAnterioresPorAnoLectivo(ano.ano_lectivo);
      const mesesIsentosIds = mesesIsentos.map(m => m.codigo);

      const propina = await this.propinaAlunoService.propinaAluno(
        codigo_inscricao,
        matricula.aluno_cacuaco,
        ano.ano_lectivo,
        matricula.codigo,
        user
      );

      if (!propina || ano.ano_lectivo === anoCorrente || anosAnterioresRaw.length === 0) continue;
      if (bolseiro?.desconto === 100 || diplomado) continue;

      // QueryBuilder para meses não pagos
      const qb = this.tipoServicoRepo
        .createQueryBuilder('ts')
        .select([
          'ts.Descricao AS servico',
          'm.mes AS mes_propina',
          'm.codigo AS codigo_mes',
          'al.Designacao AS ano',
          'al.Codigo AS codigo_anoLectivo',
          'ppc.codigo_servico AS codigo_propina',
          '(ts.Preco * 1.1) AS total',
          'ts.Preco AS valor',
          '(ts.Preco * 0.1) AS multa',
        ])
        .innerJoin('UMA_PROPINA_POR_CURSO', 'ppc', 'ppc.codigo_servico = ts.Codigo')
        .innerJoin('UMA_MESES', 'm', 'm.codigo = ppc.mes_id')
        .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = ts.codigo_ano_lectivo')
        .where('ts.Codigo = :propinaCodigo', { propinaCodigo: propina.Codigo })
        .andWhere('ts.cacuaco = :cacuaco', { cacuaco: matricula.aluno_cacuaco })
        .andWhere('ts.codigo_ano_lectivo = :ano', { ano: ano.ano_lectivo });

      if (mesesIds.length > 0) {
        qb.andWhere('ppc.mes_id NOT IN (:...pagos)', { pagos: mesesIds });
      }
      if (mesesIsentosIds.length > 0) {
        qb.andWhere('ppc.mes_id NOT IN (:...isentos)', { isentos: mesesIsentosIds });
      }

      const mesesNaoPagos = await qb.getRawMany();

      for (const mes of mesesNaoPagos) {
        let desconto = 0;
        let total = Number(mes.total);
        let taxa_desconto = 0;
        let bolsa = '';

        if (bolseiro && bolseiro.desconto > 0 && bolseiro.desconto < 100) {
          taxa_desconto = bolseiro.desconto;
          bolsa = bolseiro.instituicao;
          desconto = Number(mes.valor) * (bolseiro.desconto / 100);
          const valorComDesconto = Number(mes.valor) - desconto;
          mes.multa = valorComDesconto * 0.1;
          total = valorComDesconto + mes.multa;
        } else if (matricula.desconto > 0) {
          taxa_desconto = matricula.desconto;
          desconto = Number(mes.valor) * (matricula.desconto / 100);
          const valorComDesconto = Number(mes.valor) - desconto;
          mes.multa = valorComDesconto * 0.1;
          total = valorComDesconto + mes.multa;
        }

        const desconto_finalista = await this.pegar_finalista(mes.codigo_anoLectivo, codigo_matricula, codigo_inscricao);

        collection.push({
          codGradeCurricular: '',
          codFacturaOutrosServicos: '',
          valor: Number(mes.valor),
          multa: Number(mes.multa),
          total,
          servico: mes.servico,
          mes_propina: mes.mes_propina,
          mes_temp_id: null,
          n_prestacao: mes.codigo_mes,
          ano_lectivo: mes.ano,
          taxa_multa: 10,
          taxa_desconto,
          bolsa,
          codigo_propina: mes.codigo_propina,
          codigo_anoLectivo: mes.codigo_anoLectivo,
          desconto,
          incidencia: (propina.Preco - desconto),
          valor_iva: 0,
          tipo_taxas: 0,
          taxa_descricao: '',
        });
      }
    }

    // === DÍVIDAS NOVAS ===
    const dividas: any[] = [];
    const aluno = {
      codigo_inscricao,
      AlunoCacuaco: matricula.aluno_cacuaco,
      desconto: matricula.desconto,
      codigo_tipo_candidatura: 1,
    };

    const confirmacaoExiste = await this.confirmacao(codigo_matricula);
    const pagamentoOutubro = await this.pagouOutubro(codigo_inscricao);

    const anosInscritosRaw = await this.dataSource
      .createQueryBuilder()
      .select('c.Codigo_Ano_lectivo', 'codigo_ano_lectivo')
      .addSelect('al.ordem', 'ordem')
      .from('UMA_TB_CONFIRMACOES', 'c')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = c.Codigo_Ano_lectivo')
      .where('c.Codigo_Matricula = :matricula', { matricula: codigo_matricula })
      .andWhere(ano_lectivo ? 'c.Codigo_Ano_lectivo = :ano' : '1=1', { ano: ano_lectivo })
      .groupBy('c.Codigo_Ano_lectivo, al.ordem')
      .orderBy('al.ordem', 'ASC')
      .getRawMany();

    if (!diplomado) {
      for (const ano of anosInscritosRaw) {
        if (ano.codigo_ano_lectivo === anoCorrente) continue;

        const confirmacaoRaw = await this.dataSource
          .createQueryBuilder()
          .select('al.Codigo', 'ultimoAnoInscritoId')
          .addSelect('al.Designacao', 'ultimoAnoInscritoDesig')
          .from('UMA_TB_CONFIRMACOES', 'c')
          .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = c.Codigo_Ano_lectivo')
          .innerJoin('UMA_TB_MATRICULAS', 'm', 'm.Codigo = c.Codigo_Matricula')
          .where('m.Codigo = :matricula', { matricula: codigo_matricula })
          .andWhere('c.Codigo_Ano_lectivo = :ano', { ano: ano.codigo_ano_lectivo })
          .orderBy('al.ordem', 'DESC')
          .limit(1)
          .getRawOne();

        const confirmacao = confirmacaoRaw || null;
        const cond1 = Number(confirmacao?.ultimoAnoInscritoId) === 1 && pagamentoOutubro;
        const cond2 = Number(confirmacao?.ultimoAnoInscritoId)!== 1 && !(parseInt(confirmacao?.ultimoAnoInscritoDesig || '0') <= 2019);

        if (!cond1 && !cond2) continue;

        const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao.ultimoAnoInscritoId, codigo_inscricao);

        const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao.ultimoAnoInscritoId, mesesPagos, user, codigo_matricula);

        const propina = await this.propinaAlunoService.propinaAluno(
          codigo_inscricao,
          aluno.AlunoCacuaco,
          confirmacao.ultimoAnoInscritoId,
          codigo_matricula,
          user
        );


        if (!propina) continue;

        const taxaMultaMeses = await this.mesesPagarService.mesesPagar(
          new Date().toISOString().split('T')[0],
          1,
          null,
          confirmacao.ultimoAnoInscritoId,
          preinscricaoId,
          user,
          codigo_matricula
        );

        for (const mes of mesesNaoPagos) {
          const mesTaxa = taxaMultaMeses.find(m => m.codigo === mes.m_id);
          if (!mesTaxa) continue;

          let desconto = 0, total = 0, multa = 0, taxa_desconto = 0, bolsa = '';
          const valorComDesconto = propina.Preco - desconto;

          if (aluno.codigo_tipo_candidatura !== 1) {
            multa = 0;
            total = propina.Preco - desconto;
          } else {
            multa = valorComDesconto * (mesTaxa.taxa / 100);
            total = valorComDesconto + multa;
          }

          dividas.push({
            codGradeCurricular: '',
            codFacturaOutrosServicos: '',
            valor: propina.Preco,
            multa,
            total,
            servico: propina.Descricao,
            mes_propina: mesTaxa.mes,
            mes_temp_id: mesTaxa.codigo,
            n_prestacao: mesTaxa.prestacao,
            ano_lectivo: confirmacao.ultimoAnoInscritoDesig,
            taxa_multa: mesTaxa.taxa,
            taxa_desconto,
            bolsa,
            codigo_propina: propina.Codigo,
            codigo_anoLectivo: confirmacao.ultimoAnoInscritoId,
            desconto,
            incidencia: (propina.Preco - desconto),
            valor_iva: 0,
            tipo_taxas: 0,
            taxa_descricao: '',
          });
        }
      }
    }

    return [...collection, ...dividas];
  }

  // === 8. handlePosGraduacao ===
  private async handlePosGraduacao(user: any, codigo_matricula: number, ano_lectivo?: number): Promise<DividaDto[]> {
    if (!user || user?.codigo_tipo_candidatura === 1) return [];

    const ciclo = user?.codigo_tipo_candidatura === 2 ? this.anoAtualPrincipal : this.anoAtualPrincipal;
    const anoCorrente = ano_lectivo ?? this.anoAtualPrincipal;

    // 1. Busca matrícula e pré-inscrição (com createQueryBuilder)
    const matricula1 = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo',
        'pre.Codigo AS codigo_inscricao',
        'pre.AlunoCacuaco AS aluno_cacuaco',
        'pre.desconto',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .where('pre.Codigo = :preCodigo', { preCodigo: user.Codigo })
      .limit(1)
      .getRawOne();

    if (!matricula1?.codigo_inscricao) return [];

    // 2. Busca curso
    const curso = await this.cursoRepo
      .createQueryBuilder('c')
      .select('c.Designacao AS curso')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Curso_Candidatura = c.Codigo')
      .where('pre.Codigo = :codigo_inscricao', { codigo_inscricao: matricula1.codigo_inscricao })
      .limit(1)
      .getRawOne();

    if (!curso?.curso) return [];

    // 3. Ano letivo atual
    const anoActual = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });
    if (!anoActual) return [];

    // 4. Meses ativos para pós-graduação
    const meses = user?.codigo_tipo_candidatura === 2
      ? await this.mesTempRepo.find({ where: { activo_posgraduacao: 1 }, take: 24 })
      : await this.mesTempRepo.find({ where: { activo_posgraduacao: 1 } });

    const mesesCiclo = meses.map(m => m.id);

    // 5. Meses pagos
    const mesesPagos = user.anoLectivo >= 15
      ? await this.getMesesPagosPosGraduacaoFatura(matricula1.Codigo)
      : await this.getMesesPagosPosGraduacaoPreinscricao(matricula1.codigo_inscricao);

    const mesesIds = mesesPagos.map(m => m.codigo_mes);

    // 6. Propina
    const propina = await this.getPropinaPosGraduacao(
      curso.curso,
      matricula1.aluno_cacuaco,
      ciclo,
      user.anoLectivo
    );

    if (!propina) return [];

    // 7. Meses não pagos
    const mesesNaoPagos = await this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.designacao AS mes_propina',
        'mt.id AS codigo_mes',
      ])
      .where('mt.id IN (:...mesesCiclo)', { mesesCiclo })
      .andWhere(mesesIds.length ? 'mt.id NOT IN (:...mesesIds)' : '1 = 1', { mesesIds })
      .getRawMany();

    // 8. Monta dívidas
    const collection: DividaDto[] = mesesNaoPagos.map(mes => ({
      codGradeCurricular: '',
      codFacturaOutrosServicos: '',
      valor: propina.Preco,
      multa: 0,
      total: propina.Preco,
      servico: propina.Descricao,
      mes_propina: mes.mes_propina,
      mes_temp_id: null,
      n_prestacao: mes.codigo_mes,
      ano_lectivo: anoActual.Designacao,
      taxa_multa: 0,
      taxa_desconto: 0,
      bolsa: '',
      codigo_propina: propina.Codigo,
      codigo_anoLectivo: anoActual.Codigo,
      desconto: 0,
      valor_iva: 0,
      tipo_taxas: 0,
      codidigo_servico: undefined,
      incidencia: 0,
      taxa_descricao: '',
    }));

    return collection;
  }

  // === 9. getMesesPagosPosGraduacaoFatura ===
  private async getMesesPagosPosGraduacaoFatura(codigo_matricula: number): Promise<any[]> {
 console.log("AQUI 1");
    const result = await this.facturaRepo.query(`
      SELECT DISTINCT pi.mes_temp_id AS codigo_mes
      FROM UMA_FACTURA f
      INNER JOIN UMA_FACTURA_ITEMS fi ON fi.CodigoFactura = f.Codigo
      INNER JOIN UMA_TB_PAGAMENTOS p ON p.codigo_factura = f.Codigo
      INNER JOIN UMA_TB_PAGAMENTOSI pi ON pi.Codigo_Pagamento = p.Codigo
      INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = p.AnoLectivo
      INNER JOIN UMA_TB_TIPO_SERVICOS ts ON ts.Codigo = pi.codigo_produto
      WHERE f.CodigoMatricula = :codigo_matricula
        AND p.estado = 1
        AND ts.TipoServico = 'Mensal'
    `, [codigo_matricula]);

    return result.map(row => ({ codigo_mes: Number(row.codigo_mes) }));
  }

  // === 10. getMesesPagosPosGraduacaoPreinscricao ===
  private async getMesesPagosPosGraduacaoPreinscricao(codigo_inscricao: number): Promise<any[]> {
     console.log("AQUI 1");
    const result = await this.pagamentoRepo.query(`
      SELECT DISTINCT pi.mes_temp_id AS codigo_mes
      FROM UMA_TB_PAGAMENTOS p
      INNER JOIN UMA_TB_PAGAMENTOSI pi ON pi.Codigo_Pagamento = p.Codigo
      INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = p.Codigo_PreInscricao
      INNER JOIN UMA_TB_TIPO_SERVICOS ts ON ts.Codigo = pi.codigo_produto
      INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = p.AnoLectivo
      WHERE pre.Codigo = :codigo_inscricao
        AND ts.TipoServico = 'Mensal'
        AND p.estado = 1
    `, [codigo_inscricao]);

    return result.map(row => ({ codigo_mes: Number(row.codigo_mes) }));
  }

  // === 11. getPropinaPosGraduacao ===
  private async getPropinaPosGraduacao(curso: string, cacuaco: number, ciclo: number, anoLectivo: number): Promise<any> {
    return this.tipoServicoRepo
      .createQueryBuilder('ts')
      .where('ts.Descricao LIKE :desc', { desc: `propina ${curso}%` })
      .andWhere('ts.cacuaco = :cacuaco', { cacuaco })
      .andWhere('ts.codigo_ano_lectivo = :ciclo', { ciclo: anoLectivo === 14 ? 14 : ciclo })
      .select(['ts.Codigo', 'ts.Preco', 'ts.Descricao'])
      .getOne();
  }

  // === 12. DividasTodosAnos ===
  async DividasTodosAnos(codigo_matricula: number, tipo: number, ano_lectivo?: number): Promise<DividaDto[] | number> {
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    if (!aluno) return tipo === 2 ? 0 : [];
    console.log(aluno);
    

    const pagamentoOutubroPromise = this.pagouOutubro(aluno.codigoInscricao);
    const dividasNovaVersaoPromise = this.dividasNovaVersao(codigo_matricula, aluno.codigoInscricao, tipo === 2 ? ano_lectivo : undefined);

    let outrosServicosPromise: Promise<DividaDto[]> | null = null;
    if (tipo !== 2) {
      outrosServicosPromise = this.dividaOutrosServicos(codigo_matricula, ano_lectivo);
    }

    const [pagamentoOutubro, dividasNovaVersao, outrosServicos] = await Promise.all([
      pagamentoOutubroPromise,
      dividasNovaVersaoPromise,
      outrosServicosPromise ?? Promise.resolve([])
    ]);

    if (tipo === 2) {
      let total = dividasNovaVersao.length;
      if (!pagamentoOutubro) total += outrosServicos.length;
      return total;
    }

    let dividas = [...dividasNovaVersao, ...outrosServicos];
    if (pagamentoOutubro) dividas = dividasNovaVersao;

    return dividas;
  }


  // === 13. index ===
  async getDebt(enrrolmentId: number, codigo_inscricao: number, tipo: number, ano_lectivo?: number): Promise<any>   {
    const pre_ins = await this.preinscricaoRepo.findOne({ where: { Codigo: codigo_inscricao } });
    if (!pre_ins) throw new NotFoundException("Pre-inscrição não encontrada");

    const enr_Id = await this.matriculaRepo.findOne({ where: { Codigo: enrrolmentId } })
    if (!enr_Id) throw new NotFoundException("Matricula não encontrada");

    let dividas = await this.DividasTodosAnos(enrrolmentId, tipo, ano_lectivo) as DividaDto[];

    if (tipo === 2) {
      const propinaCorrente = await this.dividasPropinaAnoCorrente(enrrolmentId, codigo_inscricao, ano_lectivo);
      dividas = [...dividas, ...propinaCorrente];
    }

    const anoCorrente = ano_lectivo ?? this.anoAtualPrincipal;
    const anoCorrenteObj = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });
    const meses = await this.mesCalendarioRepo.find({ where: { id: 7 } });
    const mesesDividas = dividas.sort((a, b) => a.ano_lectivo.localeCompare(b.ano_lectivo));

    const totalIVA = mesesDividas.reduce((s, d) => s + d.valor_iva, 0);
    const percentagem_retencao = (await this.parametroRepo.findOne({ where: { Descricao: 'PC', "estado": 1 } }))?.Valor || 0;
    const totalDivida = mesesDividas.reduce((s, d) => s + d.total, 0);
    const total_retencao = totalDivida * (percentagem_retencao / 100);
    const totalDividaFinal = totalDivida - total_retencao;

    const saldo_reset = (await this.preinscricaoRepo.findOne({ where: { Codigo: codigo_inscricao } }))?.saldo_reset || 0;
    const dividas_recurso = await this.dividaOutrosServicos(enrrolmentId, ano_lectivo);


    return {
      empresa: await this.empresaRepo.findOne({ where: { nif: "5000977381" } }),
      anoAtual: anoCorrente,
      anoCorrente: anoCorrenteObj,
      meses,
      mesesDividas,
      totalIVA,
      percentagem_retencao,
      totalDivida: totalDividaFinal,
      total_incidencia: mesesDividas.reduce((s, d) => s + (d.valor - d.desconto), 0),
      total_retencao,
      size: mesesDividas.length,
      desconto: mesesDividas.reduce((s, d) => s + d.desconto, 0),
      precoTotal: sumValues(mesesDividas, 'valor'),
      bolsa: mesesDividas[0]?.bolsa || null,
      saldo_reset,
      somaValorDividaRecurso: 0,
      dividaOutrosServicos: dividas_recurso.length > 0 ? dividas_recurso : [],
      somaDividaFacturas: await this.dividasFacturasAnoCorrente(codigo_inscricao, ano_lectivo),
    };
  }

  // === MÉTODOS AUXILIARES ===
  async BolsaPorSemestre1(
    codigo_matricula: number,
    codigo_anoLectivo: number,
    semestre_id: number = 1,
  ): Promise<any> {
    const result = await this.bolseiroRepo.query(`
      SELECT
        b.*,
        tb.designacao AS tipo_bolsa
      FROM UMA_TB_BOLSEIROS b
      INNER JOIN UMA_TB_TIPO_BOLSAS tb ON tb.codigo = b.codigo_tipo_bolsa
      WHERE b.codigo_matricula = :codigo_matricula
        AND b.codigo_anoLectivo = :codigo_anoLectivo
        AND b.semestre = :semestre_id
        AND b.status = 0
      FETCH NEXT 1 ROWS ONLY
    `, [codigo_matricula, codigo_anoLectivo, semestre_id]);

    return result[0] || null;
  }

  async BolsaPorSemestre2(
    codigo_matricula: number,
    codigo_anoLectivo: number,
    semestre_id: number = 2,
  ): Promise<any> {
    const result = await this.bolseiroRepo.query(`
      SELECT
        b.*,
        tb.designacao AS tipo_bolsa
      FROM UMA_TB_BOLSEIROS b
      INNER JOIN UMA_TB_TIPO_BOLSAS tb ON tb.codigo = b.codigo_tipo_bolsa
      WHERE b.codigo_matricula = :codigo_matricula
        AND b.codigo_anoLectivo = :codigo_anoLectivo
        AND b.semestre = :semestre_id
        AND b.status = 0
      FETCH NEXT 1 ROWS ONLY
    `, [codigo_matricula, codigo_anoLectivo, semestre_id]);

    return result[0] || null;
  }

  private async getAlunoPorMatricula(codigo_matricula: number): Promise<{
    codigo: number;
    codigoInscricao: number;
    alunoCacuaco: number;
    desconto: number;
    codigoTipoCandidatura: number;
  } | null> {
    const raw = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo AS m_codigo',
        'pre.Codigo AS pre_codigo',
        'pre.AlunoCacuaco AS pre_alunocacuaco',
        'pre.desconto AS pre_desconto',
        'pre.codigo_tipo_candidatura AS pre_codigo_tipo_candidatura',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .where('m.Codigo = :codigo', { codigo: codigo_matricula })
      .getRawOne();

    if (!raw) return null;
    const  data = await toLowerCaseKeys(raw);

    console.log(data);
    
    

    return {
      codigo: Number(data.m_codigo),
      codigoInscricao: Number(data.pre_codigo),
      alunoCacuaco: data.pre_alunocacuaco,
      desconto: Number(data.pre_desconto),
      codigoTipoCandidatura: Number(data.pre_codigo_tipo_candidatura),
    };
  }
  private async confirmacao(codigo_matricula: number, ano_lectivo?: number): Promise<{
    ultimoAnoInscritoId: number;
    ultimoAnoInscritoDesig: string;
  } | null> {
    const qb = this.confirmacaoRepo
      .createQueryBuilder('c')
      .select('al.Codigo', 'ultimoAnoInscritoId')
      .addSelect('al.Designacao', 'ultimoAnoInscritoDesig')
      .innerJoin('UMA_TB_MATRICULAS', 'm', 'm.Codigo = c.Codigo_Matricula')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = c.Codigo_Ano_lectivo')
      .where('m.Codigo = :codigo', { codigo: codigo_matricula })
      .orderBy('al.ordem', 'DESC');

    if (ano_lectivo) {
      qb.andWhere('al.Codigo = :ano', { ano: ano_lectivo });
    }

    const raw = await qb.getRawOne();

    if (!raw) return null;

    return raw;
  }
  private async confirmacaoAnoCorrente(codigo_matricula: number, ano_lectivo?: number): Promise<any> {
    const anoId = ano_lectivo ?? this.anoAtualPrincipal;
    if (!anoId) throw new NotFoundException('Nenhum ano letivo ativo encontrado.');

    const rawResult = await this.confirmacaoRepo
      .createQueryBuilder('c')
      .select('c.Codigo_Ano_lectivo', 'ano_lectivo_id')

      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = c.Codigo_Ano_lectivo')
      .where('c.Codigo_Matricula = :matricula', { matricula: codigo_matricula })
      .andWhere('c.Codigo_Ano_lectivo = :anoId', { anoId })
      .getRawOne();

    if (!rawResult) return null;


    // CONVERTER PARA camelCase + number
    return rawResult
  }
  private async mesesPagosPorAnoPropina(
    ano_lectivo_id: number,
    codigo_inscricao: number
  ): Promise<any[]> {
    const result = await this.pagamentosiRepo
      .createQueryBuilder('pi')
      .select('DISTINCT pi.mes_temp_id', 'codigo_mes')
      .innerJoin('UMA_TB_PAGAMENTOS', 'p', 'p.Codigo = pi.Codigo_Pagamento')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = p.Codigo_PreInscricao')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = p.codigo_factura')
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
      .where('p.Codigo_PreInscricao = :codigo_inscricao', { codigo_inscricao })
      .andWhere('p.AnoLectivo = :ano_lectivo_id', { ano_lectivo_id })
      .andWhere('p.estado = 1')
      .andWhere('pi.mes_temp_id IS NOT NULL')
      .getRawMany();

    // Extrai apenas os IDs dos meses pagos
    const mesesPagos = result
      .map(row => row.codigo_mes)
      .filter((id): id is number => id !== null && id !== undefined);

    return mesesPagos;
  }


  async getPrestacoesPorAnoLectivo(
    codigo_anoLectivo: number,
    arrayMesesPagos: any[] = [],
    user: any,
    matricula: number,
  ): Promise<any> {

    const anoLectivoId = await this.getAnoLectivoByCandidatura(user, codigo_anoLectivo);

    const isencaoIds = await this.getIsencaoIds(matricula, Number(anoLectivoId));


    return this.getPrestacoes(
      anoLectivoId,
      user.codigo_tipo_candidatura,
      isencaoIds,
      arrayMesesPagos,
    );
  }
  // === Métodos auxiliares com SQL puro ===




  private async getAnoLectivoByCandidatura(user: any, ano_lectivo: number): Promise<number> {
    if (Number(user.codigo_tipo_candidatura) === 1) return ano_lectivo;
    if (Number(user.codigo_tipo_candidatura) === 2) {
      const mestrado = await this.mesesPagarService.cicloMestrado();
      return mestrado?.codigo ?? ano_lectivo;
    }
    const doutoramento = await this.mesesPagarService.cicloDoutoramento();
    return doutoramento?.codigo ?? ano_lectivo;
  }
  private async getIsencaoIds(
    matricula: number,
    anoLectivo: number
  ): Promise<number[]> {
   
    const sql = `
      SELECT mes_temp_id AS mes_temp_id
      FROM UMA_TB_ISENCOES
      WHERE codigo_matricula = :matricula
        AND estado_isensao = :estado
        AND codigo_anoLectivo = :anoLectivo
       
       
    `;

    // Passa matricula como string para evitar ORA-01722
    const raw: { mes_temp_id: string }[] = await this.dataSource.query(sql, {
      matricula: matricula,
      estado: 'Activo',
      anoLectivo
    } as any);


    // Converte para number no JS de forma segura
    return raw
      .map(r => Number(r.mes_temp_id))
      .filter((n): n is number => !isNaN(n));
  }


  private async getPrestacoes(
    anoLectivoId: number,
    tipoCandidatura: number,
    isencaoIds: number[],
    mesesPagos: string[],
  ): Promise<any> {
    // FILTRA E CONVERTE
    const cleanIds = (arr: (number | string)[]) =>
      arr
        .filter(id => id != null && id !== 'None' && id !== '')
        .map(id => Number(id))
        .filter(id => !isNaN(id));

    const isencaoIdsNum = cleanIds(isencaoIds);
    const mesesPagosNum = cleanIds(mesesPagos);



    const activoField = Number(tipoCandidatura) === 1 ? 'activo' : 'activo_posgraduacao';

    const qb = this.mesTempRepo
      .createQueryBuilder('m')
      .select([
        'm.id',
        'm.designacao',
        'm.data_limite',
        'm.data_final',
        'm.prestacao',
      ])
      .where('m.ano_lectivo = :anoLectivo', { anoLectivo: anoLectivoId.toString() })
      .andWhere(`m.${activoField} = 1`)
      .andWhere(`
        (
          (m.data_limite IS NOT NULL AND TRUNC(m.data_limite) < TRUNC(SYSDATE))
          OR
          (m.data_final IS NOT NULL AND TRUNC(m.data_final) < TRUNC(SYSDATE))
        )
      `);


    if (isencaoIdsNum.length > 0) {
      qb.andWhere('m.id NOT IN (:...isencaoIds)', { isencaoIds: isencaoIdsNum });
    }

    if (mesesPagosNum.length > 0) {
      qb.andWhere('m.id NOT IN (:...mesesPagos)', { mesesPagos: mesesPagosNum });
    }

    qb.orderBy('m.id', 'ASC');

    return await qb.getRawMany();
  }

  /**
   * Verifica se o aluno é finalista com base no ano letivo e matrícula
   * Retorna o número de cadeiras restantes (ou 0 se finalista)
   */
  async pegar_finalista(ano_lectivo: number, matricula: number, candidatoId: number): Promise<number> {


    if (!candidatoId && !matricula) return 0;

    // === 3. Busca aluno (por candidato_id ou matrícula) ===
    let aluno: any = null;

    if (candidatoId) {
      const alunoResult = await this.matriculaRepo.query(`
    SELECT 
      m.Codigo AS matricula,
      m.Codigo_Curso AS curso_matricula,
      pre.Curso_Candidatura AS curso_preinscricao
    FROM UMA_TB_MATRICULAS m
    INNER JOIN UMA_TB_ADMISSAO a ON a.codigo = m.Codigo_Aluno
    INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = a.pre_incricao
    WHERE pre.Codigo = :candidatoId
      FETCH NEXT 1 ROWS ONLY
  `, [candidatoId]);

      aluno = alunoResult[0] || null;
    }

    if (!aluno && matricula) {
      const alunoResult = await this.matriculaRepo.query(`
    SELECT 
      m.Codigo AS matricula,
      m.Codigo_Curso AS curso_matricula,
      pre.Curso_Candidatura AS curso_preinscricao
    FROM UMA_TB_MATRICULAS m
    INNER JOIN UMA_TB_ADMISSAO a ON a.codigo = m.Codigo_Aluno
    INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = a.pre_incricao
    WHERE m.Codigo = :matricula
      FETCH NEXT 1 ROWS ONLY
  `, [matricula]);

      aluno = alunoResult[0] || null;
    }

    if (!aluno) return 0;

    // === 4. Busca último ano letivo inscrito (simulação do AnoLectivoService) ===
    const ultimoAnoInscrito = await this.inscricaoAnteriorRepo.query(`
    SELECT al.Codigo
    FROM UMA_TB_INSCRICOES_ANO_ANTERIOR ia
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ia.codigo_ano_lectivo
    WHERE ia.codigo_matricula = :matricula
      AND ia.status = 1
    ORDER BY al.ordem DESC
      FETCH NEXT 1 ROWS ONLY
  `, [aluno.matricula]);


    const ultimoAnoLectivoId = ultimoAnoInscrito?.Codigo || ano_lectivo;

    // === 5. Verifica se é finalista: conta cadeiras pendentes ===
    // (Assumindo que há uma tabela de inscrições em disciplinas ou avaliações)
    const cadeirasPendentes = await this.avaliacaoRepo.query(`
    SELECT COUNT(*) AS total
    FROM UMA_INSCRICAO_AVALIACOES ia
    INNER JOIN UMA_TB_GRADE_CURRICULAR gc ON gc.Codigo = ia.codigo_grade_curricular
    INNER JOIN UMA_TB_CURSOS c ON c.Codigo = gc.codigo_curso
    WHERE ia.codigo_matricula = :matricula
      AND ia.codigo_ano_lectivo = :ultimoAnoLectivoId
      AND ia.estado = 'pendente'
  `, [aluno.matricula, ultimoAnoLectivoId]);

    const totalPendentes = Number(cadeirasPendentes[0]?.total || 0);

    // Se não houver cadeiras pendentes → finalista → retorna 0
    return totalPendentes > 0 ? totalPendentes : 0;
  }

  // Adicione no seu DebtNegotiationService

  /**
   * Calcula o total da dívida de faturas do ano corrente (não pagas ou parcialmente pagas)
   */
  async dividasFacturasAnoCorrente(preinscricaoId: number, ano_lectivo?: number): Promise<number> {
    // 1. Busca ano letivo atual com segurança
    const anoAtual = await this.anoLectivoRepo.findOne({ where: { Codigo: ano_lectivo ?? this.anoAtualPrincipal } });
    if (!anoAtual) return 0;

    // 2. Usa GROUP BY + MAX() ao invés de DISTINCT
    const faturas = await this.facturaRepo
      .createQueryBuilder('f')
      .select([
        'f.Codigo AS codigo_factura',
        'MAX(f.DataFactura) AS data_factura',
        'MAX(f.TotalPreco) AS total',
        'MAX(f.ValorAPagar) AS apagar',
        'MAX(f.Referencia) AS referencia',
        'MAX(f.Desconto) AS desconto',
        'MAX(f.TotalMulta) AS total_multa',
        'MAX(al.Designacao) AS ano',
        'MAX(f.codigo_descricao) AS codigo_descricao',
        'MAX(f.ValorEntregue) AS valor_entregue',
        'MAX(f.estado) AS estado_factura',
      ])
      .innerJoin('UMA_TB_MATRICULAS', 'm', 'm.Codigo = f.CodigoMatricula')
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = f.ano_lectivo')
      .where('pre.Codigo = :preCodigo', { preCodigo: preinscricaoId })
      .andWhere('f.corrente = 1')
      .andWhere('f.estado != 3')
      .andWhere('f.ano_lectivo = :anoLectivo', { anoLectivo: anoAtual.Codigo })
      .groupBy('f.Codigo')
      .orderBy('f.Codigo', 'ASC')
      .getRawMany();

    // 3. Calcula totais com segurança
    const totalEntregue = faturas.reduce((sum, f) => sum + (Number(f.valor_entregue) || 0), 0);
    const totalAPagar = faturas.reduce((sum, f) => sum + (Number(f.apagar) || 0), 0);

    return totalEntregue < totalAPagar ? totalAPagar - totalEntregue : 0;
  }
}
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
    const result = await this.pagamentoRepo
      .createQueryBuilder('p')
      .select('pi.mes_temp_id')
      .innerJoin('UMA_TB_PAGAMENTOSI', 'pi', 'pi.Codigo_Pagamento = p.Codigo')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = p.Codigo_PreInscricao')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = p.codigo_factura')
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
      .innerJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'ts.Codigo = fi.CodigoProduto')
      .where('pre.Codigo = :codigo', { codigo: codigo_inscricao })
      .andWhere('p.AnoLectivo = 1')
      .andWhere('pi.mes_temp_id = 5')
      .andWhere('f.estado != 3')
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .andWhere('p.estado = 1')
      .limit(1)
      .getRawOne();

    return !!result;
  }
  // === 2. dividaOutrosServicos ===
  async dividaOutrosServicos(codigo_matricula: number): Promise<DividaDto[]> {
    const dividas: DividaDto[] = [];

    // 1. Primeiro pega o aluno
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    if (!aluno?.codigo_inscricao) return [];

    // 2. Depois as outras 2 em paralelo
    const [confirmacao, pagamentoOutubro] = await Promise.all([
      this.confirmacao(codigo_matricula),
      this.pagouOutubro(aluno.codigo_inscricao),
    ]);

    const cond1 = confirmacao?.ultimoAnoInscritoId === 1 && pagamentoOutubro;
    const cond2 = confirmacao?.ultimoAnoInscritoId !== 1 &&
      !(parseInt(confirmacao?.ultimoAnoInscritoDesig || '0') <= 2019);

    if (!cond1 && !cond2) return [];

    const anoLectivoId = confirmacao?.ultimoAnoInscritoId;

    // 2. Faturas pagas (usando createQueryBuilder)
    const faturasPagas = await this.facturaRepo
      .createQueryBuilder('f')
      .select('DISTINCT ia.codigo_factura')
      .innerJoin('UMA_TB_INSCRICAO_AVALIACOES', 'ia', 'ia.codigo_factura = f.Codigo')
      .innerJoin('UMA_TB_MATRICULAS', 'm', 'm.Codigo = f.CodigoMatricula')
      .innerJoin('UMA_TB_PAGAMENTOS', 'p', 'p.codigo_factura = f.Codigo')
      .where('ia.codigo_ano_lectivo = :ano', { ano: anoLectivoId })
      .andWhere('f.corrente = 1')
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('m.Codigo = :matricula', { matricula: codigo_matricula })
      .getRawMany();

    const faturasPagasIds = faturasPagas.map(f => f.ia_codigo_factura);

    // 3. Outros serviços com JOIN + GROUP BY (Oracle-friendly)
    const query = this.avaliacaoRepo
      .createQueryBuilder('ia')
      .select([
        'f.Codigo AS codigo_factura',
        'MAX(f.ValorAPagar) AS apagar',
        'gc.Codigo AS codGradeCurricular',
        'MAX(fi.preco) AS valor',
        'MAX(fi.Multa) AS multa',
        'MAX(fi.descontoProduto) AS descontoProduto',
        'MAX(fi.Total) AS total',
        'MAX(d.Designacao) AS servico',
        'MAX(al.Codigo) AS cod_ano_lectivo',
        'MAX(al.Designacao) AS ano_lectivo',
        'MAX(ts.Codigo) AS cod_servico',
        'MAX(fi.incidencia) AS incidencia',
        'MAX(fi.valor_iva) AS valor_iva',
        'MAX(fi.taxa_iva) AS taxa_iva',
        'MAX(tt.descricao) AS taxa_descricao',
      ])
      .innerJoin('UMA_UMA_FACTURA', 'f', 'f.Codigo = ia.codigo_factura')
      .innerJoin('UMA_UMA_FACTURA_ITEMS', 'fi', 'fi.CodigoFactura = f.Codigo')
      .innerJoin('UMA_TB_ANO_LECTIVO', 'al', 'al.Codigo = f.ano_lectivo')
      .innerJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'ts.Codigo = fi.CodigoProduto')
      .leftJoin('UMA_TIPO_TAXAS', 'tt', 'tt.id = ts.taxa_iva_id')
      .leftJoin('UMA_TB_GRADE_CURRICULAR', 'gc', 'gc.Codigo = ts.codigo_grade_currilular')
      .leftJoin('.UMA_TB_DISCIPLINAS', 'd', 'd.Codigo = gc.codigo_disciplina')
      .where('ia.codigo_matricula = :matricula', { matricula: codigo_matricula })
      .andWhere('ia.codigo_ano_lectivo = :ano', { ano: anoLectivoId })
      .andWhere('ia.estado != :anulado', { anulado: 'anulado' })
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('f.corrente = 1');

    if (faturasPagasIds.length > 0) {
      query.andWhere('f.Codigo NOT IN (:...excluidos)', { excluidos: faturasPagasIds });
    }

    const outrosServicos = await query
      .groupBy('gc.Codigo, f.Codigo')
      .orderBy('gc.Codigo')
      .getRawMany();

    // 4. Processa cada serviço
    for (const value of outrosServicos) {
      let servico = value.servico || '';

      if (value.codGradeCurricular) {
        const tipoAvaliacao = await this.avaliacaoRepo.findOne({
          where: {
            codigo_matricula: codigo_matricula.toString(),
            codigo_grade: value.codGradeCurricular,
            codigo_factura: value.codigo_factura,
          },
          select: ['codigo_tipo_avaliacao'],
        });

        const codigo = Number(tipoAvaliacao?.codigo_tipo_avaliacao);
        if (codigo === 7) servico = 'Rec. ' + servico;
        else if (codigo === 22) servico = 'Melhoria. ' + servico;
        else if (codigo === 11) servico = 'Exame Especial. ' + servico;

        dividas.push({
          codGradeCurricular: value.codGradeCurricular,
          codFacturaOutrosServicos: value.codigo_factura,
          valor: value.valor,
          multa: value.multa,
          total: value.total,
          servico,
          mes_propina: '',
          mes_temp_id: null,
          n_prestacao: '',
          ano_lectivo: value.ano_lectivo,
          taxa_multa: 0,
          codigo_propina: '',
          taxa_desconto: 0,
          bolsa: '',
          codidigo_servico: value.cod_servico,
          codigo_anoLectivo: value.cod_ano_lectivo,
          desconto: value.descontoProduto,
          incidencia: value.incidencia,
          valor_iva: value.valor_iva,
          tipo_taxas: value.taxa_iva,
          taxa_descricao: value.taxa_descricao,
        });
      }
    }

    return dividas;
  }

  // === 3. dividasPropinaAnoCorrente ===
  async dividasPropinaAnoCorrente(codigo_matricula: number, pre_inscricaoId: number): Promise<DividaDto[]> {

    const dividas: DividaDto[] = [];
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: codigo_matricula, estado_matricula: 'diplomado' }
    });
    if (diplomado) return [];

    const confirmacao = await this.confirmacaoAnoCorrente(codigo_matricula);
    if (!confirmacao) return [];

    const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao?.ano_lectivo_id, aluno.codigo_inscricao);
    const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao?.ano_lectivo_id, mesesPagos, aluno, codigo_matricula);
    const propina = await this.propinaAlunoService.propinaAluno(aluno.codigo_inscricao, aluno.AlunoCacuaco, confirmacao?.ano_lectivo_id, codigo_matricula, aluno);
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
  async dividasNovaVersao(codigo_matricula: number, preinscricaoId: number): Promise<any[]> {
    let codigo_inscricao = codigo_matricula;
    let user: TbPreinscricao | null = null;


    user = await this.preinscricaoRepo.findOne({ where: { Codigo: preinscricaoId } });


    if (!user || user?.codigo_tipo_candidatura !== 1) {
      return this.handlePosGraduacao(user, codigo_matricula);
    }

    const matricula1 = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo',
        'm.Codigo_Aluno',
        'm.estado_matricula',
        'pre.Codigo AS codigo_inscricao',
        'pre.AlunoCacuaco AS aluno_cacuaco',
        'pre.desconto',
        'pre.codigo_tipo_candidatura',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .where('pre.Codigo = :preinscricaoId', { preinscricaoId })
      .orWhere('m.Codigo = :codigo_matricula', { codigo_matricula })
      .limit(1)
      .getRawOne();

    if (!matricula1) return [];

    codigo_inscricao = matricula1[0].codigo_inscricao;



    const cursoResult = await this.cursoRepo
      .createQueryBuilder('c')
      .select([
        'c.Designacao AS curso',
        'c.Codigo AS codigo_curso',
      ])
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Curso_Candidatura = c.Codigo')
      .where('pre.Codigo = :codigo_inscricao', { codigo_inscricao })
      .limit(1)
      .getRawOne();

    const curso = cursoResult[0] || null;

    const anoCorrente = this.anoAtualPrincipal;
    const anoAtual = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });
    const maiorAnoResult = await this.inscricaoAnteriorRepo.query(`
  SELECT 
    al.Designacao AS ano_designacao,
    al.Codigo AS maior
  FROM "DBUMA"."UMA_TB_INSCRICOES_ANO_ANTERIOR" ia
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ia.codigo_ano_lectivo
  WHERE "ia".codigo_matricula = ?
    AND "ia".status = 1
  ORDER BY al.ordem DESC, "al".Designacao DESC
    FETCH NEXT 1 ROWS ONLY
`, [matricula1[0].codigo]);

    const maiorAno = maiorAnoResult[0] || null;


    const inscricaoAnosAnteriores = await this.inscricaoAnteriorRepo.query(`
  SELECT 
    al.Designacao AS ano_designacao,
    ia.codigo_ano_lectivo AS ano_lectivo
  FROM "DBUMA"."UMA_TB_INSCRICOES_ANO_ANTERIOR" ia
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ia.codigo_ano_lectivo
  WHERE "ia".codigo_matricula = ?
  ORDER BY ia.codigo_ano_lectivo ASC
`, [matricula1[0].Codigo]);


    const collection: any[] = [];

    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: matricula1[0].Codigo, estado_matricula: 'diplomado' }
    });

    let bolseiroGlobal: TbBolseiroSiiuma | null = null;
    if (maiorAno?.maior) {
      const anoLectivoBolsa = await this.anoLectivoRepo.findOne({ where: { Codigo: maiorAno.maior } });
      if (!anoLectivoBolsa) return [];

      bolseiroGlobal = await this.bolseiroRepo.findOne({
        where: { codigo_matricula: matricula1[0].Codigo, ano: anoLectivoBolsa.Designacao }
      });
    }

    // === DÍVIDAS ANTIGAS (2020+) ===


    for (const ano of inscricaoAnosAnteriores) {
      const bolseiro = await this.bolseiroRepo.findOne({
        where: { codigo_matricula: matricula1[0].Codigo, ano: ano.ano_designacao }
      });

      const mesesPagos = await this.mesesPagosPorAnoPropina(ano.ano_lectivo, codigo_inscricao);
      const mesesIds = mesesPagos.map(m => m.codigo_mes);

      const propina = await this.propinaAlunoService.propinaAluno(codigo_inscricao, matricula1[0].aluno_cacuaco, ano.ano_lectivo, matricula1[0].Codigo, user);

      if (!propina || ano.ano_lectivo === anoCorrente || !inscricaoAnosAnteriores.length) continue;

      if (bolseiro && bolseiro.desconto === 100) continue;
      if (diplomado) continue;

      const mesesIsentos = await this.getPrestacoesAnosAnterioresPorAnoLectivo(ano.ano_lectivo);

      const mesesNaoPagos = await this.tipoServicoRepo.query(`
  SELECT DISTINCT
    ts.Descricao AS servico,
    m.mes AS mes_propina,
    m.codigo AS codigo_mes,
    al.Designacao AS ano,
    al.Codigo AS codigo_anoLectivo,
    ppc.codigo_servico AS codigo_propina,
    (ts.Preco * 1.1) AS total,
    ts.Preco AS valor,
    (ts.Preco * 0.1) AS multa
  FROM "DBUMA"."UMA_TB_TIPO_SERVICOS" ts
  INNER JOIN UMA_PROPINA_POR_CURSO ppc ON ppc.codigo_servico = ts.Codigo
  INNER JOIN UMA_MESES m ON m.codigo = ppc.mes_id
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ts.codigo_ano_lectivo
  WHERE "ts".Codigo = ?
    AND "ts".cacuaco = ?
    AND "ts".codigo_ano_lectivo = ?
    AND "ppc".mes_id NOT IN (${mesesIds.length ? mesesIds.map(() => '?').join(', ') : '0'})
    AND "ppc".mes_id NOT IN (${mesesIsentos.length ? mesesIsentos.map(() => '?').join(', ') : '0'})
`, [
        propina.Codigo,
        matricula1[0].aluno_cacuaco,
        ano.ano_lectivo,
        ...mesesIds,
        ...mesesIsentos
      ]);

      for (const mes of mesesNaoPagos) {
        let desconto = 0;
        let total = mes.total;
        let taxa_desconto = 0;
        let bolsa = '';

        if (bolseiro && bolseiro.desconto !== 100 && bolseiro.desconto !== 0) {
          taxa_desconto = bolseiro.desconto;
          bolsa = bolseiro.instituicao;
          desconto = mes.valor * (bolseiro.desconto / 100);
          const valorComDesconto = mes.valor - desconto;
          mes.multa = valorComDesconto * 0.1;
          total = valorComDesconto + mes.multa;
        } else if (matricula1[0].desconto > 0) {
          taxa_desconto = matricula1[0].desconto;
          desconto = mes.valor * (matricula1[0].desconto / 100);
          const valorComDesconto = mes.valor - desconto;
          mes.multa = valorComDesconto * 0.1;
          total = valorComDesconto + mes.multa;
        }

        const desconto_finalista = await this.pegar_finalista(mes.codigo_anoLectivo, codigo_matricula, codigo_inscricao);

        collection.push({
          codGradeCurricular: '',
          codFacturaOutrosServicos: '',
          valor: mes.valor,
          multa: mes.multa,
          total: total,
          servico: mes.servico,
          mes_propina: mes.mes_propina,
          mes_temp_id: null,
          n_prestacao: mes.codigo_mes,
          ano_lectivo: mes.ano,
          taxa_multa: 10,
          taxa_desconto: taxa_desconto,
          bolsa: bolsa,
          codigo_propina: mes.codigo_propina,
          codigo_anoLectivo: mes.codigo_anoLectivo,
          desconto: desconto,
          incidencia: (propina.Preco - desconto),
          valor_iva: 0,
          tipo_taxas: 0,
          taxa_descricao: ''
        });
      }
    }

    // === DÍVIDAS NOVAS ===
    const dividas: any[] = [];
    const aluno = { codigo_inscricao, AlunoCacuaco: matricula1[0].aluno_cacuaco, "desconto": matricula1[0].desconto, "codigo_tipo_candidatura": 1 };
    const confirmacaoExiste = await this.confirmacao(codigo_matricula);
    const pagamentoOutubro = await this.pagouOutubro(codigo_inscricao);

    const anosInscritos = await this.confirmacaoRepo.query(`
  SELECT 
    c.Codigo_Ano_lectivo,
    al.ordem
  FROM "DBUMA"."UMA_TB_CONFIRMACOES" c
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = c.Codigo_Ano_lectivo
  WHERE "c".Codigo_Matricula = ?
  GROUP BY c.Codigo_Ano_lectivo, "al".ordem
  ORDER BY al.ordem ASC
`, [codigo_matricula]);


    if (!diplomado) {
      for (const value of anosInscritos) {

        if (value.Codigo_Ano_lectivo === anoCorrente) continue;

        const confirmacaoResult = await this.confirmacaoRepo.query(`
  SELECT 
    al.Codigo AS ultimoAnoInscritoId,
    al.Designacao AS ultimoAnoInscritoDesig
  FROM "DBUMA"."UMA_TB_CONFIRMACOES" c
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = c.Codigo_Ano_lectivo
  INNER JOIN UMA_TB_MATRICULAS m ON m.Codigo = c.Codigo_Matricula
  WHERE "m".Codigo = ?
    AND "c".Codigo_Ano_lectivo = ?
  ORDER BY al.ordem DESC
    FETCH NEXT 1 ROWS ONLY
`, [codigo_matricula, value.Codigo_Ano_lectivo]);

        const confirmacao = confirmacaoResult[0] || null;

        const cond1 = confirmacao && confirmacao?.ultimoAnoInscritoId === 1 && pagamentoOutubro;
        const cond2 = confirmacao && confirmacao?.ultimoAnoInscritoId !== 1 && !(parseInt(confirmacao?.ultimoAnoInscritoDesig) <= 2019);


        if (!cond1 && !cond2) continue;

        const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao?.ultimoAnoInscritoId, codigo_inscricao);

        const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao?.ultimoAnoInscritoId, mesesPagos, user, codigo_matricula);


        const propina = await this.propinaAlunoService.propinaAluno(codigo_inscricao, aluno.AlunoCacuaco, confirmacao?.ultimoAnoInscritoId, codigo_matricula, user);




        if (!propina) continue;

        const taxaMultaMeses = await this.mesesPagarService.mesesPagar(new Date().toISOString().split('T')[0], 1, 0, confirmacao?.ultimoAnoInscritoId, preinscricaoId, user, codigo_matricula); // onde tem null tem que ser o user

        for (const mes of mesesNaoPagos) {
          const mesNPago = taxaMultaMeses.find(m => m.codigo === mes.id);

          if (!mesNPago) continue;

          let desconto = 0, total = 0, multa = 0, taxa_desconto = 0, bolsa = '';
          const valorComDesconto = propina.Preco - desconto;

          if (aluno?.codigo_tipo_candidatura !== 1) {
            multa = 0;
            total = propina.Preco - desconto;
          } else {
            multa = valorComDesconto * (mesNPago.taxa / 100);
            total = valorComDesconto + multa;
          }

          dividas.push({
            codGradeCurricular: '',
            codFacturaOutrosServicos: '',
            valor: propina.Preco,
            multa: multa,
            total: total,
            servico: propina.Descricao,
            mes_propina: mesNPago.mes,
            mes_temp_id: mesNPago.codigo,
            n_prestacao: mesNPago.prestacao,
            ano_lectivo: confirmacao?.ultimoAnoInscritoDesig,
            taxa_multa: mesNPago.taxa,
            taxa_desconto: taxa_desconto,
            bolsa: bolsa,
            codigo_propina: propina.Codigo,
            codigo_anoLectivo: confirmacao?.ultimoAnoInscritoId,
            desconto: desconto,
            incidencia: (propina.Preco - desconto),
            valor_iva: 0,
            tipo_taxas: 0,
            taxa_descricao: ''
          });
        }
      }
    }

    return [...collection, ...dividas];
  }

  // === 8. handlePosGraduacao ===
  private async handlePosGraduacao(user: any, codigo_matricula: number): Promise<DividaDto[]> {
    if (!user || user?.codigo_tipo_candidatura === 1) return [];

    const ciclo = user?.codigo_tipo_candidatura === 2 ? this.anoAtualPrincipal : this.anoAtualPrincipal;
    const anoCorrente = this.anoAtualPrincipal;

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
    const result = await this.facturaRepo.query(`
    SELECT DISTINCT pi.mes_temp_id AS codigo_mes
    FROM "DBUMA"."UMA_FACTURA" f
    INNER JOIN factura_items fi ON fi.CodigoFactura = f.Codigo
    INNER JOIN UMA_TB_PAGAMENTOS p ON p.codigo_factura = f.Codigo
     INNER JOIN UMA_TB_PAGAMENTOSI pi ON pi.codigo_pagamento = p.Codigo
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = p.AnoLectivo
    INNER JOIN UMA_TB_TIPO_SERVICOS ts ON ts.Codigo = pi.codigo_produto
    WHERE "f".CodigoMatricula = ?
      AND "p".estado = 1
      AND "ts".TipoServico = 'Mensal'
  `, [codigo_matricula]);

    return result.map(row => row.codigo_mes);
  }
  // === 10. getMesesPagosPosGraduacaoPreinscricao ===
  private async getMesesPagosPosGraduacaoPreinscricao(codigo_inscricao: number): Promise<number[]> {
    const result = await this.pagamentoRepo.query(`
    SELECT DISTINCT pi.mes_temp_id AS codigo_mes
    FROM "DBUMA"."UMA_TB_PAGAMENTOS" p
    INNER JOIN UMA_TB_PAGAMENTOSI pi ON pi.codigo_pagamento = p.Codigo
    INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = p.Codigo_PreInscricao
    INNER JOIN UMA_TB_TIPO_SERVICOS ts ON ts.Codigo = pi.codigo_produto
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = p.AnoLectivo
    WHERE "pre".Codigo = ?
      AND "ts".TipoServico = 'Mensal'
      AND "p".estado = 1
  `, [codigo_inscricao]);

    return result.map(row => row.codigo_mes).filter(Boolean);
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
  async DividasTodosAnos(numero_matricula: number, tipo: 1 | 2): Promise<DividaDto[] | number> {
    const aluno = await this.getAlunoPorMatricula(numero_matricula);
    const pagamentoOutubro = await this.pagouOutubro(aluno.codigo_inscricao);
    const dividasNovaVersao = await this.dividasNovaVersao(numero_matricula, aluno.codigo_inscricao);
    const outrosServicos = await this.dividaOutrosServicos(numero_matricula);


    if (tipo === 2) {
      let total = dividasNovaVersao.length;
      if (pagamentoOutubro) {
        total = dividasNovaVersao.length;
      } else {
        total += outrosServicos.length;
      }
      return total;
    }

    let dividas = [...dividasNovaVersao, ...outrosServicos];
    if (pagamentoOutubro) dividas = dividasNovaVersao;
    return dividas;
  }

  // === 13. index ===
  async getDebt(enrrolmentId: number, codigo_inscricao: number, tipo: number) {
    const pre_ins = await this.preinscricaoRepo.findOne({ where: { Codigo: codigo_inscricao } });
    if (!pre_ins) throw new NotFoundException("Pre-inscrição não encontrada");

    const enr_Id = await this.matriculaRepo.findOne({ where: { Codigo: enrrolmentId } })
    if (!enr_Id) throw new NotFoundException("Matricula não encontrada");


    let dividas = await this.DividasTodosAnos(enrrolmentId, 1) as DividaDto[];

    if (tipo === 2) {
      const propinaCorrente = await this.dividasPropinaAnoCorrente(enrrolmentId, codigo_inscricao);
      dividas = [...dividas, ...propinaCorrente];
    }

    const anoCorrente = this.anoAtualPrincipal;
    const anoCorrenteObj = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });
    const meses = await this.mesCalendarioRepo.find({ where: { id: 7 } });
    const mesesDividas = dividas.sort((a, b) => a.ano_lectivo.localeCompare(b.ano_lectivo));

    const totalIVA = mesesDividas.reduce((s, d) => s + d.valor_iva, 0);
    const percentagem_retencao = (await this.parametroRepo.findOne({ where: { Descricao: 'PC', "estado": 1 } }))?.Valor || 0;
    const totalDivida = mesesDividas.reduce((s, d) => s + d.total, 0);
    const total_retencao = totalDivida * (percentagem_retencao / 100);
    const totalDividaFinal = totalDivida - total_retencao;

    const saldo_reset = (await this.preinscricaoRepo.findOne({ where: { Codigo: codigo_inscricao } }))?.saldo_reset || 0;
    const dividas_recurso = await this.dividaOutrosServicos(enrrolmentId);


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
      somaDividaFacturas: await this.dividasFacturasAnoCorrente(codigo_inscricao),
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
  FROM "DBUMA"."UMA_TB_BOLSEIRO" b
  INNER JOIN UMA_TB_TIPO_BOLSAS tb ON tb.Codigo = b.codigo_tipo_bolsa
  WHERE "b".codigo_matricula = ?
    AND "b".codigo_anoLectivo = ?
    AND "b".semestre = ?
    AND "b".status = 0
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
  FROM "DBUMA"."UMA_TB_BOLSEIRO" b
  INNER JOIN UMA_TB_TIPO_BOLSAS tb ON tb.Codigo = b.codigo_tipo_bolsa
  WHERE "b".codigo_matricula = ?
    AND "b".codigo_anoLectivo = ?
    AND "b".semestre = ?
    AND "b".status = 0
    FETCH NEXT 1 ROWS ONLY
`, [codigo_matricula, codigo_anoLectivo, semestre_id]);

    return result[0] || null;
  }

  private async getAlunoPorMatricula(codigo_matricula: number): Promise<any> {
    const result = await this.matriculaRepo
      .createQueryBuilder('m')
      .select([
        'm.Codigo',
        'pre.Codigo AS codigo_inscricao',
        'pre.AlunoCacuaco',
        'pre.desconto',
        'pre.codigo_tipo_candidatura',
      ])
      .innerJoin('UMA_TB_ADMISSAO', 'a', 'a.codigo = m.Codigo_Aluno')
      .innerJoin('UMA_TB_PREINSCRICAO', 'pre', 'pre.Codigo = a.pre_incricao')
      .where('m.Codigo = :codigo', { codigo: codigo_matricula })
      .limit(1)
      .getRawOne();

    return result || null;
  }
  private async confirmacao(codigo_matricula: number): Promise<any> {
    const result = await this.confirmacaoRepo.query(`
    SELECT 
      al.Codigo AS ultimoAnoInscritoId,
      al.Designacao AS ultimoAnoInscritoDesig
    FROM "DBUMA"."UMA_TB_CONFIRMACOES" c
    INNER JOIN UMA_TB_MATRICULAS m ON m.Codigo = c.Codigo_Matricula
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = c.Codigo_Ano_lectivo
    WHERE "m".Codigo = ?
    ORDER BY al.ordem DESC
      FETCH NEXT 1 ROWS ONLY
  `, [codigo_matricula]);

    return result[0] || null;
  }
  private async confirmacaoAnoCorrente(codigo_matricula: number): Promise<any> {
    // 1. Busca o ano letivo corrente (Ativo)
    const anoCorrente = await this.anoLectivoRepo.query(`
    SELECT Codigo, Designacao
    FROM "DBUMA"."UMA_TB_ANO_LECTIVO"
    WHERE "estado" = 'Ativo'
      FETCH NEXT 1 ROWS ONLY
  `);

    if (!anoCorrente[0]) return null;

    const { Codigo: anoId, Designacao: anoDesignacao } = anoCorrente[0];

    // 2. Busca a confirmação para o ano corrente
    const confirmacao = await this.confirmacaoRepo.query(`
    SELECT 
      c.Codigo_Ano_lectivo AS ano_lectivo_id,
      al.Designacao AS ano_lectivo_designacao
    FROM "DBUMA"."UMA_TB_CONFIRMACOES" c
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = c.Codigo_Ano_lectivo
    WHERE "c".Codigo_Matricula = ?
      AND "c".Codigo_Ano_lectivo = ?
      FETCH NEXT 1 ROWS ONLY
  `, [codigo_matricula, anoId]);

    return confirmacao[0] || null;
  }
  private async mesesPagosPorAnoPropina(
    ano_lectivo_id: number,
    codigo_inscricao: number
  ) {
    // Validar Bem onde fica os pagamentos ou no factura_itens ou pagamentosi

    const result = await this.pagamentosiRepo.query(`
    SELECT DISTINCT pi.mes_temp_id AS codigo_mes
    FROM "DBUMA"."UMA_TB_PAGAMENTOSI" pi
    INNER JOIN UMA_TB_PAGAMENTOS p ON p.Codigo = pi.codigo_pagamento
    INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = p.Codigo_PreInscricao
    INNER JOIN UMA_FACTURA f ON f.Codigo = p.codigo_factura
    INNER JOIN UMA_FACTURA_ITEMS fi ON fi.CodigoFactura = f.Codigo
    WHERE "p".Codigo_PreInscricao = ?
      AND "p".AnoLectivo = ?
      AND "p".estado = 1
  `, [codigo_inscricao, ano_lectivo_id]);



    return result.map(row => row.codigo_mes).filter(Boolean);
  }


  async getPrestacoesPorAnoLectivo(
    codigo_anoLectivo: number,
    arrayMesesPagos: number[] = [],
    user: any,
    matricula: number,
  ): Promise<any> {

    const anoLectivoId = await this.getAnoLectivoByCandidatura(user, codigo_anoLectivo);
    const isencaoIds = await this.getIsencaoIds(matricula, anoLectivoId);



    return this.getPrestacoes(
      anoLectivoId,
      user.codigo_tipo_candidatura,
      isencaoIds,
      arrayMesesPagos,
    );
  }
  // === Métodos auxiliares com SQL puro ===




  private async getAnoLectivoByCandidatura(user: any, ano_lectivo: number): Promise<number> {
    if (user.codigo_tipo_candidatura === 1) return ano_lectivo;
    if (user.codigo_tipo_candidatura === 2) {
      const mestrado = await this.mesesPagarService.cicloMestrado();
      return mestrado?.Codigo ?? ano_lectivo;
    }
    const doutoramento = await this.mesesPagarService.cicloDoutoramento();
    return doutoramento?.Codigo ?? ano_lectivo;
  }

  private async getIsencaoIds(matricula: number, anoLectivoId: number): Promise<number[]> {
    const result = await this.dataSource.query(`
    SELECT "mes_temp_id"
    FROM "DBUMA"."UMA_TB_ISENCOES"
    WHERE "mes_temp_id" IS NOT NULL
      AND codigo_matricula = ?
      AND "estado_isensao" = 'Activo'
      AND "codigo_ano"Lectivo = ?
  `, [matricula, anoLectivoId]);

    return result.map((row: any) => row.mes_temp_id);
  }

  private async getPrestacoes(
    anoLectivoId: number,
    tipoCandidatura: number,
    isencaoIds: number[],
    mesesPagos: number[],
  ): Promise<any> {
    const activoField = tipoCandidatura === 1 ? 'activo' : 'activo_posgraduacao';

    const placeholdersIsencao = isencaoIds.length ? isencaoIds.map(() => '?').join(', ') : 'NULL';
    const placeholdersPagos = mesesPagos.length ? mesesPagos.map(() => '?').join(', ') : 'NULL';

    const query = `
      SELECT "id, "designacao", "data_limite", "data_final", "prestacao""
      FROM "DBUMA"."UMA_MES_TEMP"
      WHERE "ano_lectivo" = ?
        AND ${activoField} = 1
        ${isencaoIds.length ? `AND "id" NOT IN (${placeholdersIsencao})` : ''}
        ${mesesPagos.length ? `AND "id" NOT IN (${placeholdersPagos})` : ''}
      ORDER BY id ASC
    `;

    const params = [anoLectivoId, ...isencaoIds, ...mesesPagos].filter(Boolean);
    const result = await this.mesTempRepo.query(query, params);

    return result;
  }
  /*
  private async propinaAluno(
    codigo_inscricao: number,
    alunoCacuaco: number,
    ano_lectivo_id: number
  ): Promise<any> {
    const result = await this.tipoServicoRepo.query(`
    SELECT 
      ts.Descricao,
      ts.Preco,
      ts.Codigo
    FROM "DBUMA"."UMA_TB_TIPO_SERVICOS" ts
    INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ts.codigo_ano_lectivo
    INNER JOIN tb_preinscricao pre ON pre.Codigo = ts.codigo_preinscricao
    WHERE "pre".Codigo = ?
      AND "ts".cacuaco = ?
      AND "al".Codigo = ?
      AND "ts".Descricao LIKE 'propina %'
      FETCH NEXT 1 ROWS ONLY
  `, [codigo_inscricao, alunoCacuaco, "ano_lectivo_id"]);

    return result[0] || null;
  }
*/
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
  FROM "DBUMA"."UMA_TB_MATRICULAS" m
  INNER JOIN UMA_TB_ADMISSAO a ON a.codigo = m.Codigo_Aluno
  INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = a.pre_incricao
  WHERE "pre".Codigo = ?
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
  FROM "DBUMA"."UMA_TB_MATRICULAS" m
  INNER JOIN UMA_TB_ADMISSAO a ON a.codigo = m.Codigo_Aluno
  INNER JOIN UMA_TB_PREINSCRICAO pre ON pre.Codigo = a.pre_incricao
  WHERE "m".Codigo = ?
    FETCH NEXT 1 ROWS ONLY
`, [matricula]);

      aluno = alunoResult[0] || null;
    }

    if (!aluno) return 0;

    // === 4. Busca último ano letivo inscrito (simulação do AnoLectivoService) ===
    const ultimoAnoInscrito = await this.inscricaoAnteriorRepo.query(`
  SELECT "al".Codigo
  FROM "DBUMA"."UMA_TB_INSCRICOES_ANO_ANTERIOR" ia
  INNER JOIN UMA_TB_ANO_LECTIVO al ON al.Codigo = ia.codigo_ano_lectivo
  WHERE "ia".codigo_matricula = ?
    AND "ia".status = 1
  ORDER BY al.ordem DESC
    FETCH NEXT 1 ROWS ONLY
`, [aluno.matricula]);


    const ultimoAnoLectivoId = ultimoAnoInscrito?.Codigo || ano_lectivo;

    // === 5. Verifica se é finalista: conta cadeiras pendentes ===
    // (Assumindo que há uma tabela de inscrições em disciplinas ou avaliações)
    const cadeirasPendentes = await this.avaliacaoRepo.query(`
  SELECT COUNT(*) AS total
  FROM "DBUMA"."UMA_INSCRICAO_AVALIACOES" ia
  INNER JOIN UMA_TB_GRADE_CURRICULAR gc ON gc.Codigo = ia.codigo_grade_curricular
  INNER JOIN UMA_TB_CURSOS c ON c.Codigo = gc.codigo_curso
  WHERE "ia".codigo_matricula = ?
    AND "ia".codigo_ano_lectivo = ?
    AND "ia".estado = 'pendente'
`, [aluno.matricula, ultimoAnoLectivoId]);

    const totalPendentes = Number(cadeirasPendentes[0]?.total || 0);

    // Se não houver cadeiras pendentes → finalista → retorna 0
    return totalPendentes > 0 ? totalPendentes : 0;
  }

  // Adicione no seu DebtNegotiationService

  /**
   * Calcula o total da dívida de faturas do ano corrente (não pagas ou parcialmente pagas)
   */
async dividasFacturasAnoCorrente(preinscricaoId: number): Promise<number> {
  // 1. Busca ano letivo atual com segurança
  const anoAtual = await this.anoLectivoRepo.findOne({ where: { Codigo: this.anoAtualPrincipal } });
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
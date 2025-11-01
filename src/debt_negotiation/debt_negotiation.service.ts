import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Raw } from 'typeorm';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';
import { FacturaItem } from './entities/factura-item.entity';
import { Factura } from './entities/factura.entity';
import { InscricaoAvaliacao } from './entities/inscricao-avaliacao.entity';
import { MesTemp } from './entities/mes-temp.entity';
import { MotivoIsencaoIva } from './entities/motivo-isencao-iva.entity';
import { TbAdmissao } from './entities/tb-admissao.entity';
import { TbAnoLectivo } from './entities/tb-ano-lectivo.entity';
import { TbBolseiroSiiuma } from './entities/tb-bolseiro-siiuma.entity';
import { TbConfirmacao } from './entities/tb-confirmacao.entity';
import { TbCurso } from './entities/tb-curso.entity';
import { TbDisciplina } from './entities/tb-disciplina.entity';
import { TbGradeCurricular } from './entities/tb-grade-curricular.entity';
import { TbInscricaoAnoAnterior } from './entities/tb-inscricao-ano-anterior.entity';
import { TbMatricula } from './entities/tb-matricula.entity';
import { TbPagamento } from './entities/tb-pagamento.entity';
import { TbPagamentosi } from './entities/tb-pagamentosi.entity';
import { TbTipoServico } from './entities/tb-tipo-servico.entity';
import { TipoTaxa } from './entities/tipo-taxa.entity';


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
  taxa_iva: number;
  taxa_descricao: string | null;
}

@Injectable()
export class DividasService {
  constructor(
    @InjectRepository(TbPreinscricao) private preinscricaoRepo: Repository<TbPreinscricao>,
    @InjectRepository(TbPagamento) private pagamentoRepo: Repository<TbPagamento>,
    @InjectRepository(TbPagamentosi) private pagamentosiRepo: Repository<TbPagamentosi>,
    @InjectRepository(Factura) private facturaRepo: Repository<Factura>,
    @InjectRepository(FacturaItem) private facturaItemRepo: Repository<FacturaItem>,
    @InjectRepository(TbTipoServico) private tipoServicoRepo: Repository<TbTipoServico>,
    @InjectRepository(TbMatricula) private matriculaRepo: Repository<TbMatricula>,
    @InjectRepository(TbAdmissao) private admissaoRepo: Repository<TbAdmissao>,
    @InjectRepository(TbCurso) private cursoRepo: Repository<TbCurso>,
    @InjectRepository(TbAnoLectivo) private anoLectivoRepo: Repository<TbAnoLectivo>,
    @InjectRepository(TbInscricaoAnoAnterior) private inscricaoAnteriorRepo: Repository<TbInscricaoAnoAnterior>,
    @InjectRepository(TbConfirmacao) private confirmacaoRepo: Repository<TbConfirmacao>,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,
    @InjectRepository(TbBolseiroSiiuma) private bolseiroRepo: Repository<TbBolseiroSiiuma>,
    @InjectRepository(InscricaoAvaliacao) private avaliacaoRepo: Repository<InscricaoAvaliacao>,
    @InjectRepository(TbGradeCurricular) private gradeRepo: Repository<TbGradeCurricular>,
    @InjectRepository(TbDisciplina) private disciplinaRepo: Repository<TbDisciplina>,
    @InjectRepository(TipoTaxa) private tipoTaxaRepo: Repository<TipoTaxa>,
    @InjectRepository(MotivoIsencaoIva) private motivoIvaRepo: Repository<MotivoIsencaoIva>,
  ) {}

  // === 1. pagouOutubro ===
  async pagouOutubro(codigo_inscricao: number): Promise<any> {
    return this.pagamentoRepo
      .createQueryBuilder('p')
      .innerJoin('p.itens', 'pi')
      .innerJoin('p.preinscricao', 'pre')
      .innerJoin('p.factura', 'f')
      .innerJoin('f.items', 'fi')
      .innerJoin('fi.produto', 'ts')
      .where('pre.Codigo = :codigo', { codigo: codigo_inscricao })
      .andWhere('p.AnoLectivo = 1')
      .andWhere('pi.mes_temp_id = 5')
      .andWhere('f.estado != 3')
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .andWhere('p.estado = 1')
      .select('pi.mes_temp_id')
      .getRawOne();
  }

  // === 2. dividaOutrosServicos ===
  async dividaOutrosServicos(codigo_matricula: number): Promise<DividaDto[]> {
    const dividas: DividaDto[] = [];
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    const confirmacao = await this.confirmacao(codigo_matricula);
    const pagamentoOutubro = await this.pagouOutubro(aluno.codigo_inscricao);

    const cond1 = confirmacao?.ultimoAnoInscritoId === 1 && pagamentoOutubro;
    const cond2 = confirmacao?.ultimoAnoInscritoId !== 1 && !(parseInt(confirmacao.ultimoAnoInscritoDesig) <= 2019);

    if (!cond1 && !cond2) return [];

    // Faturas pagas
    const faturasPagas = await this.facturaRepo
      .createQueryBuilder('f')
      .innerJoin('f.matricula', 'm')
      .innerJoin('f.avaliacoes', 'ia')
      .innerJoin('f.pagamentos', 'p')
      .where('ia.codigo_ano_lectivo = :ano', { ano: confirmacao.ultimoAnoInscritoId })
      .andWhere('f.corrente = 1')
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('m.Codigo = :matricula', { matricula: codigo_matricula })
      .select('ia.codigo_factura')
      .distinct(true)
      .getRawMany();

    const array = faturasPagas.map(f => f.ia_codigo_factura);

    // Outros serviços
    const outrosServicos = await this.avaliacaoRepo
      .createQueryBuilder('ia')
      .innerJoin('ia.factura', 'f')
      .innerJoin('f.items', 'fi')
      .innerJoin('f.anoLectivo', 'al')
      .innerJoin('fi.produto', 'ts')
      .leftJoin('ts.taxaIva', 'tt')
      .leftJoin('ts.motivoIsencaoIva', 'mi')
      .leftJoin('ts.gradeCurricular', 'gc')
      .leftJoin('gc.disciplina', 'd')
      .where('ia.codigo_matricula = :matricula', { matricula: codigo_matricula })
      .andWhere('ia.codigo_ano_lectivo = :ano', { ano: confirmacao.ultimoAnoInscritoId })
      .andWhere('ia.estado != :anulado', { anulado: 'anulado' })
      .andWhere('f.estado NOT IN (1, 3)')
      .andWhere('f.corrente = 1')
      .andWhere('f.Codigo NOT IN (:...array)', { array })
      .select([
        'f.Codigo',
        'f.ValorAPagar as apagar',
        'gc.Codigo as codGradeCurricular',
        'fi.preco as valor',
        'fi.Multa as multa',
        'fi.descontoProduto as descontoProduto',
        'fi.Total as total',
        'd.Designacao as servico',
        'al.Codigo as cod_ano_lectivo',
        'al.Designacao as ano_lectivo',
        'ts.Codigo as cod_servico',
        'fi.incidencia as incidencia',
        'fi.valor_iva as valor_iva',
        'fi.taxa_iva as taxa_iva',
        'tt.descricao as taxa_descricao',
      ])
      .distinctOn(['gc.Codigo'])
      .getRawMany();

    for (const value of outrosServicos) {
      const tipo_avaliacao = await this.avaliacaoRepo
        .createQueryBuilder('ia')
        .where('ia.codigo_matricula = :matricula', { matricula: codigo_matricula })
        .andWhere('ia.codigo_grade = :grade', { grade: value.codGradeCurricular })
        .andWhere('ia.codigo_factura = :factura', { factura: value.Codigo })
        .getOne();

      let servico = value.servico;
      if (tipo_avaliacao) {
        if (tipo_avaliacao.codigo_tipo_avaliacao === 7) servico = 'Rec. ' + value.servico;
        else if (tipo_avaliacao.codigo_tipo_avaliacao === 22) servico = 'Melhoria. ' + value.servico;
        else if (tipo_avaliacao.codigo_tipo_avaliacao === 11) servico = 'Exame Especial. ' + value.servico;
      }

      if (value.codGradeCurricular) {
        dividas.push({
          codGradeCurricular: value.codGradeCurricular,
          codFacturaOutrosServicos: value.Codigo,
          valor: value.valor,
          multa: value.multa,
          total: value.total,
          servico,
          mes_propina: '',
          mes_temp_id: null,
          n_prestacao: '',
          ano_lectivo: value.ano_lectivo,
          taxa_multa: '',
          taxa_desconto: '',
          bolsa: '',
          codigo_propina: value.cod_servico,
          codigo_anoLectivo: value.cod_ano_lectivo,
          desconto: value.descontoProduto,
          incidencia: value.incidencia,
          valor_iva: value.valor_iva,
          taxa_iva: value.taxa_iva,
          taxa_descricao: value.taxa_descricao,
        });
      }
    }

    return dividas;
  }

  // === 3. dividasPropinaAnoCorrente ===
  async dividasPropinaAnoCorrente(codigo_matricula: number): Promise<DividaDto[]> {
    const dividas: DividaDto[] = [];
    const aluno = await this.getAlunoPorMatricula(codigo_matricula);
    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: codigo_matricula, estado_matricula: 'diplomado' }
    });
    if (diplomado) return [];

    const confirmacao = await this.confirmacaoAnoCorrente(codigo_matricula);
    if (!confirmacao) return [];

    const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao.ano_lectivo_id, aluno.codigo_inscricao);
    const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao.ano_lectivo_id, mesesPagos.map(m => m.codigo_mes));
    const propina = await this.propinaAluno(aluno.codigo_inscricao, aluno.AlunoCacuaco, confirmacao.ano_lectivo_id);
    if (!propina) return [];

    const bolseiro1 = await this.bolsaService.BolsaPorSemestre1(codigo_matricula, confirmacao.ano_lectivo_id, 1);
    const bolseiro2 = await this.bolsaService.BolsaPorSemestre2(codigo_matricula, confirmacao.ano_lectivo_id, 2);

    const taxaMultaMeses = await this.mesesPagarPropina.mesesPagar(new Date().toISOString().split('T')[0], 1, 0, confirmacao.ano_lectivo_id);
    const desconto_finalista = await this.pegar_finalista(confirmacao.ano_lectivo_id, codigo_matricula);

    // Semestre 1
    if (propina && (!bolseiro1 || (bolseiro1.desconto > 0 && bolseiro1.desconto < 100))) {
      const mes_temp = await this.mesTempRepo.find({ where: { semestre: 1, activo: 1 } });
      for (const mes of mesesNaoPagos) {
        for (const mes_semestre of mes_temp) {
          if (mes.id === mes_semestre.id && mes.data_final < new Date().toISOString().split('T')[0]) {
            const mesNPago = taxaMultaMeses.find(m => m.codigo === mes.id);
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
              ano_lectivo: confirmacao.ano_lectivo_designacao,
              taxa_multa,
              taxa_desconto,
              bolsa,
              codigo_propina: propina.Codigo,
              codigo_anoLectivo: confirmacao.ano_lectivo_id,
              desconto,
              incidencia: propina.Preco - desconto,
              valor_iva: 0,
              taxa_iva: 0,
              taxa_descricao: null,
            });
          }
        }
      }
    }

    // Semestre 2
    if (propina && (!bolseiro2 || (bolseiro2.desconto > 0 && bolseiro2.desconto < 100))) {
      const mes_temp = await this.mesTempRepo.find({ where: { semestre: 2, activo: 1 } });
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
              n_prestacao: mesNPago.prestacao,
              ano_lectivo: confirmacao.ano_lectivo_designacao,
              taxa_multa: mesNPago.taxa,
              taxa_desconto,
              bolsa,
              codigo_propina: propina.Codigo,
              codigo_anoLectivo: confirmacao.ano_lectivo_id,
              desconto,
              incidencia: propina.Preco - desconto,
              valor_iva: 0,
              taxa_iva: 0,
              taxa_descricao: null,
            });
          }
        }
      }
    }

    return dividas;
  }


  async getPrestacoesAnosAnterioresPorAnoLectivo(ano_lectivo: number): Promise<number[]> {
    const result = await this.mesTempRepo
      .createQueryBuilder('mt')
      .select('mt.id', 'codigo')
      .where('mt.activo = 1')
      .andWhere('mt.id <= 10')
      .getRawMany();
    return result.map(r => r.codigo);
  }

  async getPrestacoesPorAnoLectivo2(ano_lectivo: number, mesesPagos: number[] = []): Promise<any[]> {
    const result = await this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.id as id',
        'mt.designacao as mes',
        'mt.semestre as semestre',
        'mt.semestre_posgraduacao as semestre_posgraduacao',
        'mt.prestacao as prestacao'
      ])
      .where('mt.activo = 1')
      .andWhere('mt.id NOT IN (:...mesesPagos)', { mesesPagos: mesesPagos.length ? mesesPagos : [0] })
      .getRawMany();
    return result;
  }







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


  async dividasNovaVersao(codigo_matricula: number): Promise<any[]> {
    let codigo_inscricao = codigo_matricula;
    let user = null;

    // Simulação de auth e sessão
    const sessao = null; // Substituir por serviço real
    if (sessao) {
      user = await this.preinscricaoRepo.findOne({ where: { Codigo: sessao.candidato_id } });
    } else {
      user = await this.preinscricaoRepo.findOne({ where: { Bilhete_Identidade: 'numero_docuemnto' } });
    }

    if (!user || user.codigo_tipo_candidatura !== 1) {
      return this.handlePosGraduacao(user, codigo_matricula);
    }

    const matricula1 = await this.matriculaRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.admissao', 'a')
      .innerJoinAndSelect('a.preinscricao', 'pre')
      .select([
        'm.Codigo', 'm.Codigo_Aluno', 'm.estado_matricula',
        'pre.Codigo as codigo_inscricao', 'pre.AlunoCacuaco as aluno_cacuaco',
        'pre.desconto as desconto', 'pre.codigo_tipo_candidatura'
      ])
      .where('pre.Codigo = :codigo', { codigo: sessao?.candidato_id ?? user.Codigo })
      .orWhere('m.Codigo = :matricula', { matricula: codigo_matricula })
      .getRawOne();

    if (!matricula1) return [];

    codigo_inscricao = matricula1.codigo_inscricao;

    const curso = await this.cursoRepo
      .createQueryBuilder('c')
      .innerJoin('c.preinscricao', 'pre')
      .where('pre.Codigo = :codigo', { codigo: codigo_inscricao })
      .select(['c.Designacao as curso', 'c.Codigo as codigo_curso'])
      .getRawOne();

    const anoCorrente = this.anoAtualPrincipal;
    const anoAtual = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });

    const maiorAno = await this.inscricaoAnteriorRepo
      .createQueryBuilder('ia')
      .innerJoin('ia.matricula', 'm')
      .innerJoin('ia.anoLectivo', 'al')
      .select('MAX(al.Designacao)', 'ano_designacao')
      .addSelect('ANY_VALUE(al.Codigo)', 'maior')
      .where('ia.codigo_matricula = :matricula', { matricula: matricula1.Codigo })
      .andWhere('ia.status = 1')
      .getRawOne();

    const inscricaoAnosAnteriores = await this.inscricaoAnteriorRepo
      .createQueryBuilder('ia')
      .innerJoin('ia.matricula', 'm')
      .innerJoin('ia.anoLectivo', 'al')
      .select('al.Designacao as ano_designacao', 'ia.codigo_ano_lectivo as ano_lectivo')
      .where('ia.codigo_matricula = :matricula', { matricula: matricula1.Codigo })
      .orderBy('ia.codigo_ano_lectivo', 'ASC')
      .getRawMany();

    const collection: any[] = [];

    const diplomado = await this.matriculaRepo.findOne({
      where: { Codigo: matricula1.Codigo, estado_matricula: 'diplomado' }
    });

    let bolseiroGlobal = null;
    if (maiorAno?.maior) {
      const anoLectivoBolsa = await this.anoLectivoRepo.findOne({ where: { Codigo: maiorAno.maior } });
      bolseiroGlobal = await this.bolseiroRepo.findOne({
        where: { codigo_matricula: matricula1.Codigo, ano: anoLectivoBolsa.Designacao }
      });
    }

    // === DÍVIDAS ANTIGAS (2020+) ===
    for (const ano of inscricaoAnosAnteriores) {
      const bolseiro = await this.bolseiroRepo.findOne({
        where: { codigo_matricula: matricula1.Codigo, ano: ano.ano_designacao }
      });

      const mesesPagos = await this.mesesPagosPorAnoPropina(ano.ano_lectivo, codigo_inscricao);
      const mesesIds = mesesPagos.map(m => m.codigo_mes);

      const propina = await this.propinaAluno(codigo_inscricao, matricula1.aluno_cacuaco, ano.ano_lectivo);
      if (!propina || ano.ano_lectivo === anoCorrente || !inscricaoAnosAnteriores.length) continue;

      if (bolseiro && bolseiro.desconto === 100) continue;
      if (diplomado) continue;

      const mesesIsentos = await this.getPrestacoesAnosAnterioresPorAnoLectivo(ano.ano_lectivo);

      const mesesNaoPagos = await this.tipoServicoRepo
        .createQueryBuilder('ts')
        .innerJoin('propina_por_curso', 'ppc', 'ppc.codigo_servico = ts.Codigo')
        .innerJoin('meses', 'm', 'm.codigo = ppc.mes_id')
        .innerJoin('tb_ano_lectivo', 'al', 'al.Codigo = ts.codigo_ano_lectivo')
        .select([
          'ts.Descricao as servico',
          'm.mes as mes_propina',
          'm.codigo as codigo_mes',
          'al.Designacao as ano',
          'al.Codigo as codigo_anoLectivo',
          'ppc.codigo_servico as codigo_propina',
          '(ts.Preco * 1.1) as total',
          'ts.Preco as valor',
          '(ts.Preco * 0.1) as multa'
        ])
        .where('ts.Codigo = :codigo', { codigo: propina.Codigo })
        .andWhere('ts.cacuaco = :cacuaco', { cacuaco: matricula1.aluno_cacuaco })
        .andWhere('ts.codigo_ano_lectivo = :ano', { ano: ano.ano_lectivo })
        .andWhere('ppc.mes_id NOT IN (:...mesesPagos)', { mesesPagos: mesesIds.length ? mesesIds : [0] })
        .andWhere('ppc.mes_id NOT IN (:...mesesIsentos)', { mesesIsentos })
        .distinct()
        .getRawMany();

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
        } else if (matricula1.desconto > 0) {
          taxa_desconto = matricula1.desconto;
          desconto = mes.valor * (matricula1.desconto / 100);
          const valorComDesconto = mes.valor - desconto;
          mes.multa = valorComDesconto * 0.1;
          total = valorComDesconto + mes.multa;
        }

        const desconto_finalista = await this.pegar_finalista(mes.codigo_anoLectivo, codigo_matricula);

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
          taxa_iva: 0,
          taxa_descricao: ''
        });
      }
    }

    // === DÍVIDAS NOVAS ===
    const dividas: any[] = [];
    const aluno = { codigo_inscricao, AlunoCacuaco: matricula1.aluno_cacuaco, codigo_tipo_candidatura: 1 };
    const confirmacaoExiste = await this.confirmacao(codigo_matricula);
    const pagamentoOutubro = await this.pagouOutubro(codigo_inscricao);

    const anosInscritos = await this.confirmacaoRepo
      .createQueryBuilder('c')
      .innerJoin('c.anoLectivo', 'al')
      .select('c.Codigo_Ano_lectivo', 'Codigo_Ano_lectivo')
      .addSelect('al.ordem', 'ordem')
      .where('c.Codigo_Matricula = :matricula', { matricula: codigo_matricula })
      .groupBy('c.Codigo_Ano_lectivo')
      .orderBy('al.ordem', 'ASC')
      .getRawMany();

    if (!diplomado) {
      for (const value of anosInscritos) {
        if (value.Codigo_Ano_lectivo === anoCorrente) continue;

        const confirmacao = await this.confirmacaoRepo
          .createQueryBuilder('c')
          .innerJoin('c.anoLectivo', 'al')
          .innerJoin('c.matricula', 'm')
          .where('m.Codigo = :matricula', { matricula: codigo_matricula })
          .andWhere('c.Codigo_Ano_lectivo = :ano', { ano: value.Codigo_Ano_lectivo })
          .select('ANY_VALUE(al.Codigo) as ultimoAnoInscritoId')
          .addSelect('ANY_VALUE(al.Designacao) as ultimoAnoInscritoDesig')
          .orderBy('al.ordem', 'DESC')
          .getRawOne();

        const cond1 = confirmacao && confirmacao.ultimoAnoInscritoId === 1 && pagamentoOutubro;
        const cond2 = confirmacao && confirmacao.ultimoAnoInscritoId !== 1 && !(parseInt(confirmacao.ultimoAnoInscritoDesig) <= 2019);

        if (!cond1 && !cond2) continue;

        const mesesPagos = await this.mesesPagosPorAnoPropina(confirmacao.ultimoAnoInscritoId, codigo_inscricao);
        const mesesNaoPagos = await this.getPrestacoesPorAnoLectivo(confirmacao.ultimoAnoInscritoId, mesesPagos.map(m => m.codigo_mes));
        const propina = await this.propinaAluno(codigo_inscricao, aluno.AlunoCacuaco, confirmacao.ultimoAnoInscritoId);

        if (!propina) continue;

        const taxaMultaMeses = await this.mesesPagarPropina(new Date().toISOString(), 1, 0, confirmacao.ultimoAnoInscritoId);
        const anoLectivo = await this.anoLectivoRepo.findOne({ where: { Codigo: confirmacao.ultimoAnoInscritoId } });

        for (const mes of mesesNaoPagos) {
          const mesNPago = taxaMultaMeses.find(m => m.codigo === mes.id);
          if (!mesNPago) continue;

          let desconto = 0, total = 0, multa = 0, taxa_desconto = 0, bolsa = '';
          const valorComDesconto = propina.Preco - desconto;

          if (aluno.codigo_tipo_candidatura !== 1) {
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
            ano_lectivo: confirmacao.ultimoAnoInscritoDesig,
            taxa_multa: mesNPago.taxa,
            taxa_desconto: taxa_desconto,
            bolsa: bolsa,
            codigo_propina: propina.Codigo,
            codigo_anoLectivo: confirmacao.ultimoAnoInscritoId,
            desconto: desconto,
            incidencia: (propina.Preco - desconto),
            valor_iva: 0,
            taxa_iva: 0,
            taxa_descricao: ''
          });
        }
      }
    }

    return [...collection, ...dividas];
  }

  // === PÓS-GRADUAÇÃO ===
  private async handlePosGraduacao(user: any, codigo_matricula: number): Promise<any[]> {
    if (!user || user.codigo_tipo_candidatura === 1) return [];

    const ciclo = user.codigo_tipo_candidatura === 2
      ? this.anoAtualPrincipal // cicloMestrado
      : this.anoAtualPrincipal; // cicloDoutoramento

    const matricula1 = await this.matriculaRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.admissao', 'a')
      .innerJoinAndSelect('a.preinscricao', 'pre')
      .select([
        'm.Codigo', 'pre.Codigo as codigo_inscricao',
        'pre.AlunoCacuaco as aluno_cacuaco', 'pre.desconto as desconto'
      ])
      .where('pre.Codigo = :codigo', { codigo: user.Codigo })
      .getRawOne();

    const curso = await this.cursoRepo
      .createQueryBuilder('c')
      .innerJoin('c.preinscricao', 'pre')
      .where('pre.Codigo = :codigo', { codigo: matricula1.codigo_inscricao })
      .select(['c.Designacao as curso'])
      .getRawOne();

    const anoCorrente = this.anoAtualPrincipal;
    const anoActual = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });

    const meses = user.codigo_tipo_candidatura === 2
      ? await this.mesTempRepo.find({ where: { activo_posgraduacao: 1 }, take: 24 })
      : await this.mesTempRepo.find({ where: { activo_posgraduacao: 1 } });

    const mesesCiclo = meses.map(m => m.id);

    const mesesPagos = user.anoLectivo >= 15
      ? await this.getMesesPagosPosGraduacaoFatura(matricula1.Codigo)
      : await this.getMesesPagosPosGraduacaoPreinscricao(matricula1.codigo_inscricao);

    const mesesIds = mesesPagos.map(m => m.codigo_mes);
    const propina = await this.getPropinaPosGraduacao(curso.curso, matricula1.aluno_cacuaco, ciclo, user.anoLectivo);

    const collection: any[] = [];

    if (propina) {
      const mesesNaoPagos = await this.mesTempRepo
        .createQueryBuilder('mt')
        .where('mt.id IN (:...mesesCiclo)', { mesesCiclo })
        .andWhere('mt.id NOT IN (:...mesesIds)', { mesesIds: mesesIds.length ? mesesIds : [0] })
        .select('mt.designacao as mes_propina', 'mt.id as codigo_mes')
        .getRawMany();

      for (const mes of mesesNaoPagos) {
        let total = propina.Preco;
        let multa = 0;
        let desconto = 0;
        let taxa_desconto = 0;

        collection.push({
          codGradeCurricular: '',
          codFacturaOutrosServicos: '',
          valor: propina.Preco,
          multa: multa,
          total: total,
          servico: propina.Descricao,
          mes_propina: mes.mes_propina,
          mes_temp_id: null,
          n_prestacao: mes.codigo_mes,
          ano_lectivo: anoActual.Designacao,
          taxa_multa: 0,
          taxa_desconto: taxa_desconto,
          bolsa: '',
          codigo_propina: propina.Codigo,
          codigo_anoLectivo: anoActual.Codigo,
          desconto: desconto,
          valor_iva: 0,
          taxa_iva: 0
        });
      }
    }

    return collection;
  }

  private async getMesesPagosPosGraduacaoFatura(codigo_matricula: number): Promise<any[]> {
    return this.facturaRepo
      .createQueryBuilder('f')
      .innerJoin('f.items', 'fi')
      .innerJoin('f.pagamentos', 'p')
      .innerJoin('p.itens', 'pi')
      .innerJoin('p.anoLectivo', 'al')
      .innerJoin('pi.produto', 'ts')
      .where('f.CodigoMatricula = :matricula', { matricula: codigo_matricula })
      .andWhere('p.estado = 1')
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .select('pi.mes_temp_id as codigo_mes')
      .distinct()
      .getRawMany();
  }

  private async getMesesPagosPosGraduacaoPreinscricao(codigo_inscricao: number): Promise<any[]> {
    return this.pagamentoRepo
      .createQueryBuilder('p')
      .innerJoin('p.itens', 'pi')
      .innerJoin('p.preinscricao', 'pre')
      .innerJoin('pi.produto', 'ts')
      .innerJoin('p.anoLectivo', 'al')
      .where('pre.Codigo = :codigo', { codigo: codigo_inscricao })
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .andWhere('p.estado = 1')
      .select('pi.mes_temp_id as codigo_mes')
      .distinct()
      .getRawMany();
  }

  private async getPropinaPosGraduacao(curso: string, cacuaco: number, ciclo: number, anoLectivo: number): Promise<any> {
    return this.tipoServicoRepo
      .createQueryBuilder('ts')
      .where('ts.Descricao LIKE :desc', { desc: `propina ${curso}%` })
      .andWhere('ts.cacuaco = :cacuaco', { cacuaco })
      .andWhere('ts.codigo_ano_lectivo = :ciclo', { ciclo: anoLectivo === 14 ? 14 : ciclo })
      .select(['ts.Codigo', 'ts.Preco', 'ts.Descricao'])
      .getOne();
  }

  // === 4. DividasTodosAnos ===
  async DividasTodosAnos(numero_matricula: number, tipo: 1 | 2): Promise<DividaDto[] | number> {
    const aluno = await this.getAlunoPorMatricula(numero_matricula);
    const pagamentoOutubro = await this.pagouOutubro(aluno.codigo_inscricao);
    const dividasNovaVersao = await this.dividasNovaVersao(numero_matricula);
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

  // === 5. index ===
  async index(tipo: 1 | 2 = 1) {
    const aluno = await this.alunoRepository.dadosAlunoLogado();
    let dividas = await this.DividasTodosAnos(aluno.matricula, 1);

    if (tipo === 2) {
      const propinaCorrente = await this.dividasPropinaAnoCorrente(aluno.matricula);
      dividas = [...dividas, ...propinaCorrente];
    }

    const anoCorrente = await this.anoAtualPrincipal.index();
    const anoCorrenteObj = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });
    const meses = await this.mesCalendarioRepo.find({ where: { id: 7 } });
    const mesesDividas = dividas.sort((a, b) => a.ano_lectivo.localeCompare(b.ano_lectivo));

    const totalIVA = mesesDividas.reduce((s, d) => s + d.valor_iva, 0);
    const percentagem_retencao = (await this.parametroRepo.findOne({ where: { Descricao: 'PC', estado: 1 } }))?.Valor || 0;
    const totalDivida = mesesDividas.reduce((s, d) => s + d.total, 0);
    const total_retencao = totalDivida * (percentagem_retencao / 100);
    const totalDividaFinal = totalDivida - total_retencao;

    const saldo_reset = (await this.preinscricaoRepo.findOne({ where: { Codigo: aluno.codigo_inscricao } }))?.saldo_reset || 0;
    const dividas_recurso = await this.dividaOutrosServicos(aluno.matricula);

    return {
      empresa: await this.empresaRepo.findOne(),
      anoAtual: anoCorrente,
      anoCorrente: anoCorrenteObj,
      meses,
      mesesDividas,
      totalIVA,
      percentagem_retencao,
      totalDivida: totalDividaFinal,
      total_incidencia: mesesDividas.reduce((s, d) => s + d.valor, 0) - mesesDividas.reduce((s, d) => s + d.desconto, 0),
      total_retencao,
      size: mesesDividas.length,
      desconto: mesesDividas.reduce((s, d) => s + d.desconto, 0),
      precoTotal: mesesDividas.reduce((s, d) => s + d.valor, 0),
      bolsa: mesesDividas[0]?.bolsa || null,
      saldo_reset,
      somaValorDividaRecurso: 0,
      dividaRecurso: dividas_recurso.length > 0 ? dividas_recurso : [],
      somaDividaFacturas: await this.dividasFacturasAnoCorrente(),
    };
  }

  // === MÉTODOS AUXILIARES (REAL) ===
  private async getAlunoPorMatricula(codigo_matricula: number) {
    return this.matriculaRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.admissao', 'a')
      .innerJoinAndSelect('a.preinscricao', 'pre')
      .where('m.Codigo = :codigo', { codigo: codigo_matricula })
      .select(['m.Codigo', 'pre.codigo_inscricao', 'pre.AlunoCacuaco', 'pre.desconto', 'pre.codigo_tipo_candidatura'])
      .getRawOne();
  }

  private async confirmacao(codigo_matricula: number) {
    return this.confirmacaoRepo
      .createQueryBuilder('c')
      .innerJoin('c.matricula', 'm')
      .innerJoin('c.anoLectivo', 'al')
      .where('m.Codigo = :matricula', { matricula: codigo_matricula })
      .select('ANY_VALUE(al.Codigo)', 'ultimoAnoInscritoId')
      .addSelect('ANY_VALUE(al.Designacao)', 'ultimoAnoInscritoDesig')
      .orderBy('al.ordem', 'DESC')
      .getRawOne();
  }

  private async confirmacaoAnoCorrente(codigo_matricula: number) {
    const anoCorrente = await this.anoAtualPrincipal.index();
    return this.confirmacaoRepo
      .createQueryBuilder('c')
      .innerJoin('c.anoLectivo', 'al')
      .where('c.Codigo_Matricula = :matricula', { matricula: codigo_matricula })
      .andWhere('al.Codigo = :ano', { ano: anoCorrente })
      .select(['c.Codigo_Ano_lectivo as ano_lectivo_id', 'al.Designacao as ano_lectivo_designacao'])
      .getRawOne();
  }

  private async mesesPagosPorAnoPropina(ano_lectivo_id: number, codigo_inscricao: number) {
    return this.pagamentosiRepo
      .createQueryBuilder('pi')
      .innerJoin('pi.pagamento', 'p')
      .where('p.Codigo_PreInscricao = :inscricao', { inscricao: codigo_inscricao })
      .andWhere('p.AnoLectivo = :ano', { ano: ano_lectivo_id })
      .andWhere('p.estado = 1')
      .select('pi.mes_id as codigo_mes')
      .distinct(true)
      .getRawMany();
  }

  private async getPrestacoesPorAnoLectivo(ano_lectivo_id: number, mesesPagos: number[]) {
    return this.tipoServicoRepo
      .createQueryBuilder('ts')
      .innerJoin('ts.anoLectivo', 'al')
      .where('al.Codigo = :ano', { ano: ano_lectivo_id })
      .andWhere('ts.TipoServico = :tipo', { tipo: 'Mensal' })
      .select(['ts.Descricao as servico', 'ts.Preco as valor'])
      .getRawMany();
  }

  private async propinaAluno(codigo_inscricao: number, alunoCacuaco: number, ano_lectivo_id: number) {
    return this.tipoServicoRepo
      .createQueryBuilder('ts')
      .innerJoin('ts.anoLectivo', 'al')
      .innerJoin('ts.preinscricao', 'pre')
      .where('pre.Codigo = :inscricao', { inscricao: codigo_inscricao })
      .andWhere('ts.cacuaco = :cacuaco', { cacuaco: alunoCacuaco })
      .andWhere('al.Codigo = :ano', { ano: ano_lectivo_id })
      .andWhere('ts.Descricao LIKE :descricao', { descricao: 'propina %' })
      .select(['ts.Descricao', 'ts.Preco', 'ts.Codigo'])
      .getRawOne();
  }

  private async pegar_finalista(ano_lectivo_id: number, codigo_matricula: number): Promise<number> {
    // Implementação real conforme sua lógica
    return 0;
  }
}
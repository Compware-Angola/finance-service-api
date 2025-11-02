
/*
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Factura, FacturaItem, TbPreinscricao, TbMatricula, TbAdmissao, TbAnoLectivo, NegociacaoDivida, InscricaoAvaliacao } from '../entities';
import { randomInt } from 'crypto';
import { createHash } from 'crypto';
import { RSA } from 'rsa-compat'; // npm install rsa-compat

@Injectable()
export class CreateDebtNegotiationService {
  private readonly anoAtualPrincipal = 1; // Substituir por serviço real

  constructor(
    @InjectRepository(Factura) private facturaRepo: Repository<Factura>,
    @InjectRepository(FacturaItem) private facturaItemRepo: Repository<FacturaItem>,
    @InjectRepository(TbPreinscricao) private preinscricaoRepo: Repository<TbPreinscricao>,
    @InjectRepository(TbMatricula) private matriculaRepo: Repository<TbMatricula>,
    @InjectRepository(TbAdmissao) private admissaoRepo: Repository<TbAdmissao>,
    @InjectRepository(TbAnoLectivo) private anoLectivoRepo: Repository<TbAnoLectivo>,
    @InjectRepository(NegociacaoDivida) private negociacaoRepo: Repository<NegociacaoDivida>,
    @InjectRepository(InscricaoAvaliacao) private avaliacaoRepo: Repository<InscricaoAvaliacao>,
    private dataSource: DataSource,
  ) {}

  private async pegarChavePrivada(): Promise<string> {
    return process.env.RSA_PRIVATE_KEY || '-----BEGIN RSA PRIVATE KEY-----...'; // Configurar
  }

  private async gerarNumeracaoFactura(): Promise<{ numeracao: string; numSequencia: number; hashAnterior: string }> {
    const yearNow = new Date().getFullYear();
    const ultima = await this.facturaRepo.findOne({
      where: { tipo_documento_factura_id: 2 },
      order: { Codigo: 'DESC' },
    });

    let numSequencia = 1;
    let hashAnterior = '';
    if (ultima) {
      const dataUltima = new Date(ultima.DataFactura);
      const dataAtual = new Date();
      if (dataUltima.getFullYear() === dataAtual.getFullYear()) {
        numSequencia = ultima.numSequenciaFactura + 1;
        hashAnterior = ultima.hashValor;
      }
    }

    return { numeracao: `FT ${yearNow}/${numSequencia}`, numSequencia, hashAnterior };
  }

  private async gerarHashRSA(plaintext: string): Promise<string> {
    const rsa = new RSA();
    const privateKey = await this.pegarChavePrivada();
    await rsa.importKey(privateKey, 'private');
    const signature = await rsa.sign(plaintext, 'sha1');
    return Buffer.from(signature).toString('base64');
  }

  // === NEGOCIAÇÃO 50% ===
  async criarNegociacao50(dto: any, user: any): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const aluno = await this.getAlunoLogado(user);
      const anoCorrente = this.anoAtualPrincipal;
      const anoLectivo = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });

      const dados = dto.fatura_item;
      const totalDivida = dto.totalDivida;
      const descontoTotal = dto.desconto || 0;
      const precoTotal = dto.precoTotal;
      const total_retencao = dto.total_retencao;
      const total_incidencia = dto.total_incidencia;
      const totalIVA = dto.totalIVA;
      const saldo_reset = dto.saldo_reset || 0;

      let valorApagar = totalDivida;
      if (saldo_reset > 0 && saldo_reset < totalDivida / 2) {
        valorApagar = totalDivida - saldo_reset;
        await queryRunner.manager.update(TbPreinscricao, { Codigo: aluno.codigo_inscricao }, { saldo_reset: 0, saldo_reset_anter: saldo_reset });
      }

      const { numeracao, numSequencia, hashAnterior } = await this.gerarNumeracaoFactura();
      const datactual = new Date().toISOString().replace('T', ' ').split('.')[0];
      const plaintext = `${datactual.split(' ')[0]};${datactual.replace(' ', 'T')};${numeracao};${precoTotal.toFixed(2)};${hashAnterior}`;
      const hashValor = await this.gerarHashRSA(plaintext);

      const referencia = randomInt(100000000, 999999999).toString();

      const novaFatura = queryRunner.manager.create(Factura, {
        DataFactura: new Date(),
        TotalPreco: precoTotal,
        CodigoMatricula: aluno.matricula,
        polo_id: aluno.polo_id,
        Referencia: referencia,
        ValorAPagar: parseFloat(valorApagar.toFixed(2)),
        ano_lectivo: anoLectivo.Codigo,
        codigo_descricao: 5,
        TotalMulta: dados.reduce((s, d) => s + d.multa, 0),
        Desconto: descontoTotal,
        totalIVA,
        total_incidencia,
        total_retencao,
        texto_hash: plaintext,
        hashValor,
        numSequenciaFactura: numSequencia,
        NextFactura: numeracao,
        next: numeracao,
        tipo_documento_factura_id: 2,
      });

      const faturaSalva:any = await queryRunner.manager.save(novaFatura);

      // Atualizar faturas antigas
      for (const d of dados) {
        if (d.codFacturaOutrosServicos) {
          await queryRunner.manager.update(Factura, { Codigo: d.codFacturaOutrosServicos }, { estado: 3 });
          await queryRunner.manager.update(InscricaoAvaliacao, { codigo_factura: d.codFacturaOutrosServicos }, { codigo_factura: faturaSalva.Codigo });
        }
      }

      // Salvar itens
      for (const d of dados) {
        await queryRunner.manager.insert(FacturaItem, {
          CodigoProduto: d.codigo_propina,
          CodigoFactura: faturaSalva.Codigo,
          Quantidade: 1,
          Total: d.total,
          Mes: d.mes_propina || '',
          mes_temp_id: d.mes_temp_id,
          Multa: d.multa,
          preco: d.valor,
          descontoProduto: d.desconto,
          codigo_anoLectivo: d.codigo_anoLectivo,
          incidencia: d.incidencia,
          valor_iva: d.valor_iva,
          taxa_iva: d.taxa_iva,
        });
      }

      const qtd_meses = dados.filter(d => d.mes_propina).length;
      const valorPM = qtd_meses > 0 ? dados.reduce((s, d) => s + d.total, 0) / qtd_meses : 0;

      await this.criarNegociacao(queryRunner, {
        valor_divida: parseFloat(valorApagar.toFixed(2)),
        primeiroValorApagar: parseFloat((valorApagar / 2).toFixed(2)),
        codigo_matricula: aluno.matricula,
        codigo_ano_lectivo: anoLectivo.Codigo,
        codigo_fatura: faturaSalva.Codigo,
        valorRestante: parseFloat(valorApagar.toFixed(2)),
        qtd_prestacoes: qtd_meses,
        tipo_negociacao_id: 1,
      }, valorPM, qtd_meses, totalDivida);

      await queryRunner.commitTransaction();
      return { last_fatura_id: faturaSalva.Codigo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  }

  // === NEGOCIAÇÃO 100% ===
  async criarNegociacao100(dto: any, user: any): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const aluno = await this.getAlunoLogado(user);
      const anoCorrente = this.anoAtualPrincipal;
      const anoLectivo = await this.anoLectivoRepo.findOne({ where: { Codigo: anoCorrente } });

      const dados = dto.fatura_item;
      const totalDivida = dto.totalDivida;
      const descontoTotal = dto.desconto || 0;
      const precoTotal = dto.precoTotal;
      const total_retencao = dto.total_retencao;
      const total_incidencia = dto.total_incidencia;
      const totalIVA = dto.totalIVA;

      const valorApagar = totalDivida;

      const { numeracao, numSequencia, hashAnterior } = await this.gerarNumeracaoFactura();
      const datactual = new Date().toISOString().replace('T', ' ').split('.')[0];
      const plaintext = `${datactual.split(' ')[0]};${datactual.replace(' ', 'T')};${numeracao};${precoTotal.toFixed(2)};${hashAnterior}`;
      const hashValor = await this.gerarHashRSA(plaintext);

      const referencia = randomInt(100000000, 999999999).toString();

      const novaFatura = queryRunner.manager.create(Factura, {
        DataFactura: new Date(),
        TotalPreco: precoTotal,
        CodigoMatricula: aluno.matricula,
        polo_id: aluno.polo_id,
        Referencia: referencia,
        ValorAPagar: parseFloat(valorApagar.toFixed(2)),
        ano_lectivo: anoLectivo.Codigo,
        codigo_descricao: 5,
        TotalMulta: dados.reduce((s, d) => s + d.multa, 0),
        Desconto: descontoTotal,
        totalIVA,
        total_incidencia,
        total_retencao,
        texto_hash: plaintext,
        hashValor,
        numSequenciaFactura: numSequencia,
        NextFactura: numeracao,
        next: numeracao,
      });

      const faturaSalva:any = await queryRunner.manager.save(novaFatura);

      for (const d of dados) {
        if (d.codFacturaOutrosServicos) {
          await queryRunner.manager.update(Factura, { Codigo: d.codFacturaOutrosServicos }, { estado: 3 });
          await queryRunner.manager.update(InscricaoAvaliacao, { codigo_factura: d.codFacturaOutrosServicos }, { codigo_factura: faturaSalva.Codigo });
        }
      }

      for (const d of dados) {
        await queryRunner.manager.insert(FacturaItem, {
          CodigoProduto: d.codigo_propina,
          CodigoFactura: faturaSalva.Codigo,
          Quantidade: 1,
          Total: d.total,
          Mes: d.mes_propina || '',
          mes_temp_id: d.mes_temp_id,
          Multa: d.multa,
          preco: d.valor,
          descontoProduto: d.desconto,
          codigo_anoLectivo: d.codigo_anoLectivo,
          incidencia: d.incidencia,
          valor_iva: d.valor_iva,
          taxa_iva: d.taxa_iva,
        });
      }

      const qtd_meses = dados.filter(d => d.mes_propina).length;
      const valorPM = qtd_meses > 0 ? dados.reduce((s, d) => s + d.total, 0) / qtd_meses : 0;

      await this.criarNegociacao(queryRunner, {
        valor_divida: parseFloat(valorApagar.toFixed(2)),
        primeiroValorApagar: parseFloat(valorApagar.toFixed(2)),
        codigo_matricula: aluno.matricula,
        codigo_ano_lectivo: anoLectivo.Codigo,
        codigo_fatura: faturaSalva.Codigo,
        valorRestante: 0,
        qtd_prestacoes: qtd_meses,
        tipo_negociacao_id: 2,
      }, valorPM, qtd_meses, totalDivida);

      await queryRunner.commitTransaction();
      return { last_fatura_id: faturaSalva.Codigo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(error.message);
    } finally {
      await queryRunner.release();
    }
  }

  private async criarNegociacao(queryRunner: any, dados: any, valorPM: number, qtd_meses: number, totalDivida: number) {
    // Simulação de mesesPagarDivida e store
    const negociacao = queryRunner.manager.create(NegociacaoDivida, dados);
    await queryRunner.manager.save(negociacao);
  }

  private async getAlunoLogado(candidato_id: number): Promise<any> {
    return this.matriculaRepo
      .createQueryBuilder('m')
      .innerJoin('m.admissao', 'a')
      .innerJoin('a.preinscricao', 'p')
      .where('p.Codigo = :codigo', { codigo:candidato_id })
      .select([
        'm.Codigo as matricula',
        'm.Codigo_Curso as curso_matricula',
        'p.Codigo_Turno as turno_id',
        'p.polo_id as polo_id',
        'p.Codigo as codigo_inscricao',
      ])
      .getRawOne();
  }
}

*/
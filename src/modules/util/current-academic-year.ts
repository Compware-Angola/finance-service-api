import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { TipoCandidatura } from '../invoice/entities/tipo.candidatura.entity';
@Injectable()
export class AnoLectivoUtil {
  private readonly FALLBACK_ANO_ID = 23;

  constructor(
    @InjectRepository(AcademicYear)
    private readonly anoLectivoRepo: Repository<AcademicYear>,
    @InjectRepository(TipoCandidatura)
    private readonly tipoCandidaturaRepo: Repository<TipoCandidatura>,
  ) {}

  async getAnoAtualId(tipo_cand: number = 1): Promise<number> {
    try {
      const anoAtivo = await this.anoLectivoRepo.findOne({
        where: {
          faseAnoLectivo: 'ACTIVO',
          codigoTipoCandidatura: tipo_cand,
        },
        select: ['codigo'],
      });

      return anoAtivo?.codigo ?? this.FALLBACK_ANO_ID;
    } catch (error) {
      console.warn(
        'Erro ao buscar ano letivo ativo:',
        error instanceof Error ? error.message : error,
      );

      return this.FALLBACK_ANO_ID;
    }
  }

  async getSiglaTipoCandidaturaPorAno(
    anoLectivoId: number,
  ): Promise<string | null> {
    const ano = await this.anoLectivoRepo.findOne({
      where: { codigo: anoLectivoId },
      select: ['codigo', 'codigoTipoCandidatura'],
    });

    if (!ano) {
      throw new Error('Ano lectivo não encontrado');
    }

    if (!ano.codigoTipoCandidatura) {
      return null;
    }

    const tipoCandidatura = await this.tipoCandidaturaRepo.findOne({
      where: { id: ano.codigoTipoCandidatura },
      select: ['id', 'sigla'],
    });

    return tipoCandidatura?.sigla ?? null;
  }

  /**
   * Retorna o semestre atual baseado na data de hoje
   */
  async getSemestreAtual(tipo_cand: number = 1): Promise<{
    anoId: number;
    semestre: number | null;
    descricao: string;
    dataInicio: Date | null;
    dataFim: Date | null;
  }> {
    const anoId = await this.getAnoAtualId(tipo_cand);

    const ano = await this.anoLectivoRepo.findOne({
      where: { codigo: anoId },
      select: [
        'codigo',
        'dataInicioPrimeiroSemestre',
        'dataFimPrimeiroSemestre',
        'dataInicioSegundoSemestre',
        'dataFimSegundoSemestre',
      ],
    });

    if (!ano) {
      throw new Error('Ano lectivo não encontrado');
    }

    const hoje = new Date();

    if (
      !ano.dataInicioPrimeiroSemestre ||
      !ano.dataFimPrimeiroSemestre ||
      !ano.dataInicioSegundoSemestre ||
      !ano.dataFimSegundoSemestre
    ) {
      throw new Error('Datas do semestre não configuradas no ano lectivo');
    }

    const inicio1 = new Date(ano.dataInicioPrimeiroSemestre);
    const fim1 = new Date(ano.dataFimPrimeiroSemestre);

    const inicio2 = new Date(ano.dataInicioSegundoSemestre);
    const fim2 = new Date(ano.dataFimSegundoSemestre);

    if (hoje >= inicio1 && hoje <= fim1) {
      return {
        anoId,
        semestre: 1,
        dataFim: fim1,
        dataInicio: inicio1,
        descricao: 'PRIMEIRO_SEMESTRE',
      };
    }

    if (hoje >= inicio2 && hoje <= fim2) {
      return {
        anoId,
        semestre: 2,
        dataFim: fim2,
        dataInicio: inicio2,
        descricao: 'SEGUNDO_SEMESTRE',
      };
    }

    return {
      anoId,
      semestre: null,
      dataFim: null,
      dataInicio: null,
      descricao: 'FORA_DO_PERIODO',
    };
  }

  /**
   * Retorna os dois semestres configurados do ano letivo atual
   */
  async getSemestresConfigurados(
    tipo_cand: number = 1,
    ano_lectivo?: number,
  ): Promise<{
    anoLetivo: {
      id: number;
      designacao: string;
      tipoCandidatura: number | null;
    } | null;
    primeiroSemestre: {
      dataInicio: Date;
      dataFim: Date;
      descricao: string;
    } | null;
    segundoSemestre: {
      dataInicio: Date;
      dataFim: Date;
      descricao: string;
    } | null;
  }> {
    const anoId = await this.getAnoAtualId(tipo_cand);

    const ano = await this.anoLectivoRepo.findOne({
      where: { codigo: ano_lectivo || anoId },
      select: [
        'codigo',
        'dataInicioPrimeiroSemestre',
        'dataFimPrimeiroSemestre',
        'dataInicioSegundoSemestre',
        'dataFimSegundoSemestre',
        'codigoTipoCandidatura',
        'designacao',
      ],
    });

    if (!ano) {
      throw new Error('Ano lectivo não encontrado');
    }

    const primeiroSemestre =
      ano.dataInicioPrimeiroSemestre && ano.dataFimPrimeiroSemestre
        ? {
            dataInicio: new Date(ano.dataInicioPrimeiroSemestre),
            dataFim: new Date(ano.dataFimPrimeiroSemestre),
            descricao: 'PRIMEIRO_SEMESTRE',
          }
        : null;

    const segundoSemestre =
      ano.dataInicioSegundoSemestre && ano.dataFimSegundoSemestre
        ? {
            dataInicio: new Date(ano.dataInicioSegundoSemestre),
            dataFim: new Date(ano.dataFimSegundoSemestre),
            descricao: 'SEGUNDO_SEMESTRE',
          }
        : null;

    const anoLetivo = ano.codigo
      ? {
          id: ano.codigo,
          designacao: ano.designacao ?? '',
          tipoCandidatura: ano.codigoTipoCandidatura ?? null,
        }
      : null;

    return {
      anoLetivo,
      primeiroSemestre,
      segundoSemestre,
    };
  }
}

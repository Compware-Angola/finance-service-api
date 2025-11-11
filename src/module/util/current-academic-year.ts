// src/utils/ano-lectivo.util.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYear } from '../invoice/entities/academic.year.entity';

@Injectable()
export class AnoLectivoUtil {
  private readonly FALLBACK_ANO_ID = 23; // fallback caso não encontre

  constructor(
    @InjectRepository(AcademicYear)
    private readonly anoLectivoRepo: Repository<AcademicYear>,
  ) {}

  /**
   * Retorna o ID do ano letivo atual (estado = 'Ativo')
   * Se não encontrar, "retorna" o fallback (23)
   */
  async getAnoAtualId(): Promise<number> {
    try {
      const anoAtivo = await this.anoLectivoRepo.findOne({
        where: { estado: 'Ativo' },
        select: ['Codigo'],
        cache: 60_000, // cache por 1 minuto
      });

      return anoAtivo?.Codigo ?? this.FALLBACK_ANO_ID;
    } catch (error) {
      console.warn('Erro ao buscar ano letivo ativo:', error.message);
      return this.FALLBACK_ANO_ID;
    }
  }

  /**
   * Versão síncrona com cache em memória (ideal para uso em serviços)
   */
  private static cachedAnoId: number | null = null;
  private static lastFetched: number = 0;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  static async getAnoAtualIdSync(
    repo: Repository<AcademicYear>,
    fallback: number = 23,
  ): Promise<number> {
    const now = Date.now();
    if (
      this.cachedAnoId !== null &&
      now - this.lastFetched < this.CACHE_TTL
    ) {
      return this.cachedAnoId;
    }

    try {
      const ano = await repo.findOne({
        where: { estado: 'Ativo' },
        select: ['Codigo'],
      });
      this.cachedAnoId = ano?.Codigo ?? fallback;
      this.lastFetched = now;
      return this.cachedAnoId;
    } catch {
      return fallback;
    }
  }
}
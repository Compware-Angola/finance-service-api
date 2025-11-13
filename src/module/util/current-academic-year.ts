// src/utils/ano-lectivo.util.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AcademicYear } from '../invoice/entities/academic.year.entity';

@Injectable()
export class AnoLectivoUtil {
  private readonly FALLBACK_ANO_ID = 23;
  private static cachedAnoId: number | null = null;
  private static lastFetched = 0;
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos (ajuste conforme necessidade)

  constructor(
    @InjectRepository(AcademicYear)
    private readonly anoLectivoRepo: Repository<AcademicYear>,
  ) {}

  /**
   * Retorna o ID do ano letivo ativo com cache em memória + fallback
   */
  async getAnoAtualId(): Promise<number> {
    const now = Date.now();

    // 1. Usa cache em memória se válido
    if (
      AnoLectivoUtil.cachedAnoId !== null &&
      now - AnoLectivoUtil.lastFetched < AnoLectivoUtil.CACHE_TTL
    ) {
      return AnoLectivoUtil.cachedAnoId;
    }

    try {
      // 2. Busca no banco (com cache do TypeORM como backup)
      const anoAtivo = await this.anoLectivoRepo.findOne({
        where: { estado: 'Ativo' },
        select: ['Codigo'],
        cache: {
          id: 'ano_letivo_ativo',
          milliseconds: 60_000, 
        },
      });

      const anoId = anoAtivo?.Codigo ?? this.FALLBACK_ANO_ID;

      // 3. Atualiza cache em memória
      AnoLectivoUtil.cachedAnoId = anoId;
      AnoLectivoUtil.lastFetched = now;

      return anoId;
    } catch (error) {
      console.warn('Erro ao buscar ano letivo ativo:', error instanceof Error ? error.message : error);
      
      // 4. Em caso de erro, retorna fallback e mantém cache antigo (se houver)
      return AnoLectivoUtil.cachedAnoId ?? this.FALLBACK_ANO_ID;
    }
  }

  /**
   * Limpa o cache (útil em testes ou admin)
   */
  static clearCache() {
    this.cachedAnoId = null;
    this.lastFetched = 0;
  }
}
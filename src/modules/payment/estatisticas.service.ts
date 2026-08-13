import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PagamentoDiaDto,
  EstatisticasQueryDto,
} from './dto/estatisticas-query.dto';

const MAX_RANGE_DAYS = 92;

@Injectable()
export class EstatisticasService {
  constructor(
    @InjectDataSource()
    private readonly ds: DataSource,
  ) { }

  async getAgrupado(
    dto: EstatisticasQueryDto,
  ): Promise<{ data: PagamentoDiaDto[] }> {
    const inicio = new Date(dto.dataInicio);
    const fim = new Date(dto.dataFim);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new BadRequestException(
        'Datas inválidas. Use o formato YYYY-MM-DD.',
      );
    }
    if (fim < inicio) {
      throw new BadRequestException(
        'dataFim deve ser maior ou igual a dataInicio.',
      );
    }

    const diffDias = Math.ceil(
      (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDias > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Intervalo máximo permitido: ${MAX_RANGE_DAYS} dias (~3 meses). ` +
        `Intervalo informado: ${diffDias} dias.`,
      );
    }

    // Query melhorada:
    // - Filtra registos sem FORMA_PAGAMENTO válida (NULL ou vazio)
    // - Usa TRUNC(DATA) para Oracle ou DATE(DATA) para MySQL/SQLite
    const rows: { DATA: string; FORMA_PAGAMENTO: string; TOTAL: number }[] =
      await this.ds.query(
        `SELECT
           SUBSTR(DATA, 1, 10)          AS DATA,
           UPPER(TRIM(FORMA_PAGAMENTO)) AS FORMA_PAGAMENTO,
           COUNT(*)                     AS TOTAL
         FROM FK2_TB_PAGAMENTOS
         WHERE DATA BETWEEN :dataInicio AND :dataFim
           AND DATA IS NOT NULL
           AND TRIM(FORMA_PAGAMENTO) IS NOT NULL
           AND TRIM(FORMA_PAGAMENTO) != '-'
         GROUP BY
           SUBSTR(DATA, 1, 10),
           UPPER(TRIM(FORMA_PAGAMENTO))
         ORDER BY DATA ASC`,
        { dataInicio: dto.dataInicio, dataFim: dto.dataFim } as any,
      );

    /**
     * Percorre os resultados do banco e constrói dinamicamente
     * a estrutura agrupada por data, sem campos fixos.
     *
     * Banco retorna (ex):
     *   { DATA: '2020-01-27', FORMA_PAGAMENTO: 'DEPOSITO', TOTAL: 278 }
     *   { DATA: '2020-01-27', FORMA_PAGAMENTO: 'TPA',      TOTAL: 243 }
     *
     * Resultado:
     *   { data: '27/01/2020', deposito: 278, tpa: 243 }
     */
    const mapa = new Map<string, PagamentoDiaDto>();

    for (const row of rows) {
      // Formata 'YYYY-MM-DD' → 'DD/MM/YYYY'
      const [ano, mes, dia] = row.DATA.split('-');
      const dataFormatada = `${dia}/${mes}/${ano}`;

      // Normaliza o nome da forma de pagamento para camelCase minúsculo
      // ex: 'FORMA_PAGAMENTO' → 'formaPagamento', 'TPA' → 'tpa'
      const campo = this.normalizarCampo(row.FORMA_PAGAMENTO);

      if (!mapa.has(dataFormatada)) {
        mapa.set(dataFormatada, { data: dataFormatada });
      }

      const entrada = mapa.get(dataFormatada)!;

      // Incrementa dinamicamente — se o campo ainda não existe, começa em 0
      entrada[campo] = ((entrada[campo] as number) || 0) + Number(row.TOTAL);
    }

    return { data: Array.from(mapa.values()) };
  }

  /**
   * Converte o nome vindo do banco para uma chave de objeto legível.
   * Exemplos:
   *   'DEPOSITO'      → 'deposito'
   *   'TPA'           → 'tpa'
   *   'FORMA_PAGAMENTO' → 'formaPagamento'
   *   'SEM_FORMA'     → 'semForma'
   */
  private normalizarCampo(valor: string): string {
    return valor
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());
  }
}

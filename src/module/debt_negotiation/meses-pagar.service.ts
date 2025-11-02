import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';


import { MesTemp } from './entities/mes-temp.entity';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';

interface MesPagar {
  codigo: number;
  mes: string;
  data: string;
  prestacao: number;
  taxa: number;
}

@Injectable()
export class MesesPagarService {
  constructor(
    @InjectRepository(TbPreinscricao)
    private readonly preinscricaoRepo: Repository<TbPreinscricao>,

    @InjectRepository(MesTemp)
    private readonly mesTempRepo: Repository<MesTemp>,

   private dataSource: DataSource,

  ) {}

  async mesesPagar(
    data: string, // formato: 'YYYY-MM-DD'
    tipo: 1 | 2,
    mes_id: number | null,
    codigo_anoLectivo: number,
    candidatoId: number,
    user: any,
    matricula: number,
  
  ): Promise<MesPagar[]> {
    // 1. Busca candidato logado (via sessão ou dados)

 
    // 2. Define ano letivo com base no tipo de candidatura
    const anoLectivoId = await this.getAnoLectivoByCandidatura(user, codigo_anoLectivo);

    // 3. Busca meses com base no tipo (1 = todos, 2 = específico)
    const mesesTemp = await this.getMesesTemp(tipo, user, anoLectivoId, mes_id);

    const isencaoMulta = await this.getIsencaoMulta(candidatoId);

    // 5. Calcula taxa para cada mês
    const mesesApagar: MesPagar[] = [];

    for (const [index, mes] of mesesTemp.entries()) {
      const prestacoesIsentasMulta = await this.checkIsencaoMultaRaw(
       matricula,
        mes.id_mes,
        anoLectivoId,
      );

      let taxa = 0;
      if (data > mes.data) {
        if (!prestacoesIsentasMulta) {
          taxa = await this.parametroTaxaMulta(
            data,
            mes.data,
            mes.data_final,
            mesesTemp,
            index,
          );
        }
      }

      mesesApagar.push({
        codigo: mes.id_mes,
        mes: mes.mes,
        data: mes.data,
        prestacao: mes.prestacao,
        taxa,
      });
    }

    return mesesApagar;
  }


async parametroTaxaMulta(
    dataBanco: string,
    dataLimite: string,
    dataFinal: string,
    mesesTemp: any[],
    key: number,
  ): Promise<number> {
    const dataLimiteObj = new Date(dataLimite);
    const dataBancoObj = new Date(dataBanco);

    // Mesmo mês, mas pagamento após limite
    if (this.isSameMonth(dataLimiteObj, dataBancoObj) && dataBancoObj > dataLimiteObj) {
      return this.getPercentagemByCodigo(1); // 5%
    }

    const diffMonths = this.diffInMonths(dataLimiteObj, dataBancoObj);

    // Atraso de 1 mês
    if (diffMonths === 1 && dataBancoObj > dataLimiteObj) {
      return this.getPercentagemByCodigo(2); // 7%
    }

    // Atraso de 2 ou mais meses
    if (diffMonths >= 2) {
      return this.getPercentagemByCodigo(3); // 10%
    }

    return 0; // Sem multa
  }

  // === Métodos auxiliares com SQL puro ===

  private async getPercentagemByCodigo(codigo: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT percentagem FROM tb_parametros_multa WHERE codigo = ? LIMIT 1`,
      [codigo],
    );
    return result[0]?.percentagem ?? 0;
  }

  private isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
  }

  private diffInMonths(date1: Date, date2: Date): number {
    const yearDiff = date2.getFullYear() - date1.getFullYear();
    const monthDiff = date2.getMonth() - date1.getMonth();
    return yearDiff * 12 + monthDiff;
  }


  private async getAnoLectivoByCandidatura(user: any, codigo_anoLectivo: number): Promise<number> {
    if (user?.codigo_tipo_candidatura === 1) return codigo_anoLectivo;
    if (user?.codigo_tipo_candidatura === 2) return (await this.cicloMestrado()).Codigo;
    return (await this.cicloDoutoramento()).Codigo;
  }

  private async getMesesTemp(
    tipo: 1 | 2,
    user: any,
    anoLectivoId: number,
    mes_id: number | null,
  ) {
    const query = this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.id AS id_mes',
        'mt.designacao AS mes',
        'mt.data_limite AS data',
        'mt.data_final AS data_final',
        'mt.prestacao AS prestacao',
      ])
      .where('mt.ano_lectivo = :anoLectivoId', { anoLectivoId })
      .andWhere('mt.isencao = 0');

    if (user?.codigo_tipo_candidatura === 1) {
      query.andWhere('mt.activo = 1');
    } else {
      query.andWhere('mt.activo_posgraduacao = 1');
    }

    if (tipo === 2 && mes_id) {
      query.andWhere('mt.id = :mes_id', { mes_id });
    }

    return query.getRawMany();
  }

  private async getIsencaoMulta(candidatoId: number | null) {
    if (!candidatoId) return { isento: 0 };
    return (
      (await this.preinscricaoRepo
        .createQueryBuilder()
        .select('isencao_multa AS isento')
        .where('Codigo = :candidatoId', { candidatoId })
        .getRawOne()) ?? { isento: 0 }
    );
  }



  // === Stubs (ajuste conforme sua estrutura) ===
  
 /**
   * Retorna o ciclo de Mestrado
   */
async cicloMestrado(){
  const result = await this.dataSource.query(`
    SELECT Codigo, Designacao
    FROM tb_ano_lectivo
    WHERE Designacao = 'Ciclo Mestrado'
    LIMIT 1
  `);
  return result[0] || null;
}

async cicloDoutoramento(){
  const result = await this.dataSource.query(`
    SELECT Codigo, Designacao
    FROM tb_ano_lectivo
    WHERE Designacao = 'Ciclo Doutoramento'
    LIMIT 1
  `);
  return result[0] || null;
}
async checkIsencaoMultaRaw(
  matricula: number,
  mes_id: number,
  ano_lectivo_id: number,
): Promise<boolean> {
  const result = await this.dataSource.query(`
    SELECT 1
    FROM tb_isencoe_multa
    WHERE mes_temp_id = ?
      AND codigo_matricula = ?
      AND estado_isensao = 'Activo'
      AND codigo_anoLectivo = ?
    LIMIT 1
  `, [mes_id, matricula, ano_lectivo_id]);

  return result.length > 0;
}
}
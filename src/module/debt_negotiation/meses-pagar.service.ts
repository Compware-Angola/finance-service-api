import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MesTemp } from './entities/mes-temp.entity';
import { TbPreinscricao } from './entities/tb-preinscricao.entity';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

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
    private readonly dataSource: DataSource,
  ) {}

  async mesesPagar(
    data: string,
    tipo: 1 | 2,
    mes_id: number | null,
    codigo_anoLectivo: number,
    candidatoId: number,
    user: any,
    matricula: number,
  ): Promise<MesPagar[]> {
    const anoLectivoId = await this.getAnoLectivoByCandidatura(user, codigo_anoLectivo);
    const mesesTemp = await this.getMesesTemp(tipo, user, anoLectivoId, mes_id);
    console.log("M",mesesTemp);
    
   // const isencaoMulta = await this.getIsencaoMulta(candidatoId);

    const mesesApagar: MesPagar[] = [];
    for (const [index, aa] of mesesTemp.entries()) {
      const mes =toLowerCaseKeys(aa)
      console.log(mes);
      
      const prestacoesIsentasMulta = await this.checkIsencaoMultaRaw(matricula, mes.id_mes, anoLectivoId);

      let taxa = 0;
      if (data > mes.data) {
        if (!prestacoesIsentasMulta) {
          taxa = await this.parametroTaxaMulta(data, mes.data, mes.data_final, mesesTemp, index);
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

    if (this.isSameMonth(dataLimiteObj, dataBancoObj) && dataBancoObj > dataLimiteObj) {
      return this.getPercentagemByCodigo(1); // 5%
    }

    const diffMonths = this.diffInMonths(dataLimiteObj, dataBancoObj);
    if (diffMonths === 1 && dataBancoObj > dataLimiteObj) {
      return this.getPercentagemByCodigo(2); // 7%
    }

    if (diffMonths >= 2) {
      return this.getPercentagemByCodigo(3); // 10%
    }

    return 0;
  }

  // === MÉTODOS AUXILIARES (CORRIGIDOS) ===

  private async getPercentagemByCodigo(codigo: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT "percentagem" FROM "DBUMA"."UMA_TB_PARAMETROS_MULTA" WHERE "codigo" = :codigo FETCH NEXT 1 ROWS ONLY`,
     [  codigo ]
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
    if (Number(user?.codigo_tipo_candidatura) === 1) return codigo_anoLectivo;
    if (Number(user?.codigo_tipo_candidatura) === 2) return (await this.cicloMestrado())?.Codigo || 0;
    return (await this.cicloDoutoramento())?.Codigo || 0;
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

    if (Number(user?.codigo_tipo_candidatura) === 1) {
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
    const result = await this.preinscricaoRepo
      .createQueryBuilder()
      .select('isencao_multa AS isento')
      .where('Codigo = :candidatoId', { candidatoId })
      .getRawOne();
    return result ?? { isento: 0 };
  }

  // === CICLOS (EXATAMENTE COMO VOCÊ QUER) ===

async cicloDoutoramento() {
const result = await this.dataSource.query(`
  SELECT "Codigo", "Designacao"
  FROM "DBUMA"."UMA_TB_ANO_LECTIVO"
  WHERE "Designacao" = 'Ciclo Doutoramento'
  FETCH NEXT 1 ROWS ONLY
`);

  return result[0] || null;
}

async cicloMestrado() {
  const result = await this.dataSource.query(`
    SELECT "Codigo", "Designacao"
    FROM "DBUMA"."UMA_TB_ANO_LECTIVO"
    WHERE "Designacao" = 'Ciclo Mestrado'
    FETCH NEXT 1 ROWS ONLY
  `);
  return result[0] || null;
}
async checkIsencaoMultaRaw(
  matricula: number,
  mes_id: string | number,
  ano_lectivo_id: string | number,
): Promise<boolean> {
  const result = await this.dataSource.query(
    `
      SELECT 1
      FROM "DBUMA"."UMA_TB_ISENCOE_MULTA"
      WHERE "mes_temp_id" = :1
        AND "codigo_matricula" = :2
        AND "estado_isensao" = 'Activo'
        AND "codigo_anoLectivo" = :3
      FETCH NEXT 1 ROWS ONLY
    `,
    [mes_id, matricula, ano_lectivo_id]
  );

  return result.length > 0;
}
}
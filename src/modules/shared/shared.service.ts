import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class SharedService {
  constructor(private readonly dataSource: DataSource) { }

  async findPoloDropdown() {
    const sql = `
       SELECT
        p.ID,
        p.OBSERVACAO,
        p.DESIGNACAO
       FROM FK2_POLOS p
      -- WHERE p.STATUS_ =1
       ORDER BY p.ID ASC
     `;

    const result = await this.dataSource.query(sql);

    return await toLowerCaseKeys(result);
  }
  async findTipoTaxaDropdown() {
    const sql = `
       SELECT
        t.ID,
        t.TAXA,
        t.DESCRICAO
       FROM FK2_TIPO_TAXAS t
     
       ORDER BY t.ID ASC
     `;

    const result = await this.dataSource.query(sql);

    return await toLowerCaseKeys(result);
  }
  async findMotivoIsencaoDropdown() {
    const sql = `
       SELECT
       mt.CODIGO,
       mt.CODIGOMOTIVO,
       mt.DESCRICAO
       FROM FK2_MOTIVOS_ISENCAO_IVA mt
     
       ORDER BY mt.CODIGO ASC
     `;

    const result = await this.dataSource.query(sql);
    return await toLowerCaseKeys(result);

  }

}

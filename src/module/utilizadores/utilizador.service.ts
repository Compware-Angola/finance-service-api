import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListUtilizadorDto } from './dto/list-utilizador.dto';

@Injectable()
export class UtilizadorService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListUtilizadorDto) {
    const { page = 1, limit = 10, search = '' } = query;

    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [utilizadores, totalResult] = await Promise.all([
      this.dataSource.query(
        `
        SELECT uti.NOME, uti.PK_UTILIZADOR AS codigo
        FROM FK2_MCA_TB_UTILIZADOR uti
        INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
          ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
        WHERE grupo_uti.FK_GRUPO IN (14, 9)
        AND (
          LOWER(uti.NOME) LIKE LOWER(:1)
          OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
        )
        ORDER BY uti.NOME
        OFFSET :3 ROWS FETCH NEXT :4 ROWS ONLY
        `,
        [searchParam, searchParam, offset, limit],
      ),

      this.dataSource.query(
        `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_MCA_TB_UTILIZADOR uti
        INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
          ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
        WHERE grupo_uti.FK_GRUPO IN (14, 9)
        AND (
          LOWER(uti.NOME) LIKE LOWER(:1)
          OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
        )
        `,
        [searchParam, searchParam],
      ),
    ]);

    const total = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(utilizadores),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { CreateBolsaDto } from './dto/create-bolsa.dto';
import { UpdateBolsaDto } from './dto/update-bolsa.dto';

import { DataSource } from 'typeorm';
import { FindBolsaDto } from './dto/find-bolsa.dto';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';

@Injectable()
export class BolsaService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async create(createBolsaDto: CreateBolsaDto) {
    return 'This action adds a new bolsa';
  }

  async findAll(query: FindBolsaDto) {
    const {
      designacao,
      instituicao,
      codigoInstituicao,
      codigoTipoCredito,
      codigoTipoDesconto,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    const params = {
      designacao: designacao ?? null,
      instituicao: instituicao ?? null,
      codigoInstituicao: codigoInstituicao ?? null,
      codigoTipoCredito: codigoTipoCredito ?? null,
      codigoTipoDesconto: codigoTipoDesconto ?? null,
    };

    const whereClause = `
      WHERE 1=1
      AND (:designacao IS NULL 
           OR UPPER(A.DESIGNACAO) LIKE '%' || UPPER(:designacao) || '%')
      AND (:instituicao IS NULL 
           OR UPPER(D.INSTITUICAO) LIKE '%' || UPPER(:instituicao) || '%')
      AND (:codigoInstituicao IS NULL 
           OR A.CODIGO_INSTITUICAO = :codigoInstituicao)
      AND (:codigoTipoCredito IS NULL 
           OR A.CODIGO_TIPO_CREDITO = :codigoTipoCredito)
      AND (:codigoTipoDesconto IS NULL 
           OR A.CODIGO_TIPO_DESCONTO = :codigoTipoDesconto)
    `;

    const [dataResutl, total] = await Promise.all([
      this.dataSource.query(
        `
        SELECT 
            A.CODIGO
          , A.DESIGNACAO
          , A.CODIGO_INSTITUICAO
          , D.INSTITUICAO                 AS INSTITUICAO
          , A.VALOR_DESCONTO
          , A.CODIGO_TIPO_DESCONTO
          , E.DESIGNACAO                  AS DESCRICAO_TIPO_DESCONTO
          , A.CODIGO_TIPO_CREDITO
          , F.DESIGNACAO                  AS DESCRICAO_TIPO_CREDITO
        FROM FK2_TB_BOLSAS A
        LEFT JOIN FK2_TB_INSTITUICAO D
               ON D.CODIGO = A.CODIGO_INSTITUICAO
        LEFT JOIN FK2_TB_TIPO_CREDITO F
               ON F.CODIGO = A.CODIGO_TIPO_CREDITO
        LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS E
               ON E.CODIGO = A.CODIGO_TIPO_DESCONTO
        ${whereClause}
        ORDER BY A.CODIGO
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),

      this.dataSource.query(
        `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_TB_BOLSAS A
        LEFT JOIN FK2_TB_INSTITUICAO D
               ON D.CODIGO = A.CODIGO_INSTITUICAO
        LEFT JOIN FK2_TB_TIPO_CREDITO F
               ON F.CODIGO = A.CODIGO_TIPO_CREDITO
        LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS E
               ON E.CODIGO = A.CODIGO_TIPO_DESCONTO
        ${whereClause}
        `,
        params as any,
      ),
    ]);

    const totalRecords = Number(total[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(dataResutl),
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} bolsa`;
  }

  update(id: number, updateBolsaDto: UpdateBolsaDto) {
    return `This action updates a #${id} bolsa`;
  }

  remove(id: number) {
    return `This action removes a #${id} bolsa`;
  }
}
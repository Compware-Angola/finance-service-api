import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GetPaymentRefenceFilterDto } from './dto/get-payment-referenc-filter.dto';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ListPaymentRefenceService {
  constructor(private readonly dataSource: DataSource) { }

  async list(filter: GetPaymentRefenceFilterDto): Promise<PagedResult<any>> {
    const {
      dataInicio,
      dataFinal,
      codigoproduto,
      status,
      codigoFactura,
      codigoMatricula,
      reference,
      anoLectivo,
      limit = 10,
      page = 1,
    } = filter;

    const offset = (page - 1) * limit;

    const sql = `

        SELECT
          DISTINCT f.codigo                    AS codigo_factura,
          m.codigo                    AS codigo_matricula,
          p.NOME_COMPLETO             AS nome,
          p.CONTACTOS_TELEFONICOS     AS contacto,

          pr.ENTITY_ID                AS entidade,
          pr.REFERENCE                AS referencia,
          pr.amount                   AS preco,
          pr.start_date               AS data_inicio,
          pr.end_date                 AS data_final,
          pr.status_                  AS estado,
          pg.data_operacao            AS data_pagamento,
          c.designacao                AS curso,
          po.designacao               AS polo
        FROM fk2_factura f
        INNER JOIN fk2_pagamento_por_referencias pr ON pr.factura_codigo = f.codigo
        INNER JOIN FK2_TB_MATRICULAS m ON m.codigo = f.CODIGOMATRICULA
        INNER JOIN FK2_TB_ADMISSAO a ON a.codigo = m.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO p ON p.codigo = a.PRE_INCRICAO
        LEFT JOIN FK2_POLOS po ON po.id = p.POLO_ID
        LEFT JOIN FK2_TB_CURSOS c ON c.codigo = m.CODIGO_CURSO
        LEFT  JOIN fk2_tb_pagamentos pg ON pg.codigo_factura = pr.factura_codigo
        WHERE 1=1
          AND (:dataInicio IS NULL OR TRUNC(pr.start_date) >= TO_DATE(:dataInicio, 'YYYY-MM-DD'))
          AND (:dataFinal IS NULL OR TRUNC(pr.start_date) <= TO_DATE(:dataFinal, 'YYYY-MM-DD'))

          AND (:status IS NULL OR pr.status_ = :status)
          AND (:codigoFactura IS NULL OR f.codigo = :codigoFactura)
          AND (:codigoMatricula IS NULL OR m.codigo = :codigoMatricula)
          AND (:reference IS NULL OR pr.reference = :reference)
          AND (:anoLectivo IS NULL OR f.ANO_LECTIVO = :anoLectivo)
          AND (
          :codigoproduto IS NULL
          OR EXISTS (
              SELECT 1
              FROM FK2_FACTURA_ITEMS fi
              WHERE fi.codigofactura = f.codigo
                AND fi.CODIGOPRODUTO = :codigoproduto
          )
        )
        ORDER BY pr.start_date DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY

    `;

    const rawResults = await this.dataSource.query(sql, {
      dataInicio: dataInicio ?? null,
      dataFinal: dataFinal ?? null,
      codigoproduto: codigoproduto ?? null,
      status: status ?? null,
      codigoFactura: codigoFactura ?? null,
      codigoMatricula: codigoMatricula ?? null,
      reference: reference ?? null,
      anoLectivo: anoLectivo ?? null,
      offset,
      limit,
    } as any);

    // Contagem total
    const countSql = `
      SELECT COUNT(*) AS total
      FROM fk2_factura f
      INNER JOIN fk2_pagamento_por_referencias pr ON pr.factura_codigo = f.codigo
      INNER JOIN FK2_TB_MATRICULAS m ON m.codigo = f.CODIGOMATRICULA
      WHERE 1=1
        AND (:dataInicio IS NULL OR TRUNC(pr.start_date) >= TO_DATE(:dataInicio, 'YYYY-MM-DD'))
        AND (:dataFinal IS NULL OR TRUNC(pr.start_date) <= TO_DATE(:dataFinal, 'YYYY-MM-DD'))
        AND (:status IS NULL OR pr.status_ = :status)
        AND (:codigoFactura IS NULL OR f.codigo = :codigoFactura)
        AND (:codigoMatricula IS NULL OR m.codigo = :codigoMatricula)
        AND (:reference IS NULL OR pr.reference = :reference)
        AND (:anoLectivo IS NULL OR f.ANO_LECTIVO = :anoLectivo)
        AND (
          :codigoproduto IS NULL
          OR EXISTS (
              SELECT 1
              FROM FK2_FACTURA_ITEMS fi
              WHERE fi.codigofactura = f.codigo
                AND fi.CODIGOPRODUTO = :codigoproduto
          )
        )
    `;

    const totalResult = await this.dataSource.query(countSql, {
      dataInicio: dataInicio ?? null,
      dataFinal: dataFinal ?? null,
      codigoproduto: codigoproduto ?? null,
      status: status ?? null,
      codigoFactura: codigoFactura ?? null,
      codigoMatricula: codigoMatricula ?? null,
      reference: reference ?? null,
      anoLectivo: anoLectivo ?? null,
    } as any);

    const total = Number(totalResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rawResults),
      total,
      page,
      limit,
      totalPages,
    };
  }
}

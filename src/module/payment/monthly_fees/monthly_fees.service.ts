// monthly-fees.service.ts
import { Injectable } from '@nestjs/common';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { DataSource } from 'typeorm';
import { MonthlyFeesFilterDto } from './dto/monthly-fees-filter.dto';

@Injectable()
export class MonthlyFeesService {
  constructor(private dataSource: DataSource) {}

async findMonthlyFees(paginationQuery: MonthlyFeesFilterDto): Promise<PagedResult<any>> {
  const { limit = 10, page = 1, codigo_matricula, codAnoLectivo } = paginationQuery;
  const skip = (page - 1) * limit;

  // 1. Contagem: apenas meses que têm fatura (ou podem ter) para essa matrícula
  const countQuery = `
    SELECT COUNT(DISTINCT mt.id) AS total
    FROM mes_temp mt
    INNER JOIN factura_items fi ON fi.mes_temp_id = mt.id
    INNER JOIN factura f ON fi.CodigoFactura = f.Codigo
    WHERE mt.ano_lectivo = ?
      AND f.CodigoMatricula = ?
  `;

  const countParams = [codAnoLectivo, codigo_matricula];

  // 2. Dados: meses com fatura para essa matrícula
  const dataQuery = `
    SELECT
      mt.id AS mes_temp_id,
      mt.designacao AS mes,
      mt.data_inicial AS data_inicial,
      mt.data_final AS data_final,
      mt.data_limite AS data_limite,
      mt.data_final_desconto AS data_final_desconto,
      fi.codigo AS id_item,
      fi.CodigoProduto AS id_tipo_servico,
      ts.Descricao AS descricao_servico,
      ts.TipoServico AS tipo_servico,
      f.CodigoMatricula AS codigo_matricula,
      f.ano_lectivo AS ano_lectivo_fatura,
      f.estado AS estado_fatura,
      f.Referencia AS reference,
      f.dataVencimento AS data_vencimento,
      f.Codigo AS codigo_factura,
      f.TotalPreco AS total_preco,
      f.Desconto AS desconto,
      fi.Total AS total_item,
      fi.valor_pago AS valor_pago,
      CASE 
        WHEN fi.valor_pago >= fi.Total THEN 1  -- pago total
        WHEN fi.valor_pago > 0 THEN 2          -- pago parcial
        ELSE 0                                 -- não pago
      END AS status_pagamento
    FROM mes_temp mt
    INNER JOIN factura_items fi ON fi.mes_temp_id = mt.id
    INNER JOIN factura f ON fi.CodigoFactura = f.Codigo
    LEFT JOIN tb_tipo_servicos ts ON fi.CodigoProduto = ts.Codigo
    WHERE mt.ano_lectivo = ?
      AND f.CodigoMatricula = ?
      AND f.estado !=3
    GROUP BY mt.id, fi.codigo, f.Codigo  -- evita duplicatas se houver múltiplos items
    ORDER BY mt.ordem_mes ASC
    LIMIT ? OFFSET ?;
  `;

  const dataParams = [codAnoLectivo, codigo_matricula, limit, skip];

  const [totalResult, items] = await Promise.all([
    this.dataSource.query(countQuery, countParams),
    this.dataSource.query(dataQuery, dataParams),
  ]);

  const total = parseInt(totalResult[0]?.total || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: items,
    total,
    page,
    limit,
    totalPages,
  };
}
}
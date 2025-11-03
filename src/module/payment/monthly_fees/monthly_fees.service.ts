// monthly-fees.service.ts
import { Injectable } from '@nestjs/common';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { DataSource } from 'typeorm';
import { MonthlyFeesFilterDto } from './dto/monthly-fees-filter.dto';

@Injectable()
export class MonthlyFeesService {
  constructor(private dataSource: DataSource) {}

  async findMonthlyFees(
    paginationQuery: MonthlyFeesFilterDto
  ): Promise<PagedResult<any>> {
    const { limit = 10, page = 1 , codigo_matricula, codAnoLectivo} = paginationQuery;

    // Calcula o 'offset' (quantos itens pular)
    const skip = (page - 1) * limit;

    // 1. Consulta para Contagem Total (Utilizando '?' para MySQL/MariaDB)
    // Mantendo a lógica de contar APENAS os meses do ano letivo, independente de terem fatura.
    // Se quiser contar apenas os faturados, use a query do dataQuery.
    const countQuery = `
      SELECT COUNT(mt.id) AS total
      FROM mes_temp mt
      WHERE
        mt.ano_lectivo = ?;
    `;

    // 2. Consulta para Obter os Dados (Com LIMIT, OFFSET e '?' para MySQL/MariaDB)
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
        fi.Total AS total_item,
        fi.valor_pago AS valor_pago,
        CASE
          WHEN fi.codigo IS NOT NULL AND fi.valor_pago > 0 THEN 1
          ELSE 0
        END AS status_pagamento
      FROM mes_temp mt
      LEFT JOIN factura_items fi ON fi.mes_temp_id = mt.id
      LEFT JOIN tb_tipo_servicos ts ON fi.CodigoProduto = ts.Codigo
      LEFT JOIN factura f
        ON fi.CodigoFactura = f.Codigo
        AND f.CodigoMatricula = ? -- A condição da matrícula DEVE ficar aqui para o LEFT JOIN funcionar
      WHERE
        mt.ano_lectivo = ? -- Condição do ano letivo
      ORDER BY mt.ordem_mes ASC
      LIMIT ? OFFSET ?;
    `;

    // Parâmetros de consulta
    // Nota: O countQuery agora só usa codAnoLectivo
    const countParams = [codAnoLectivo];

    // Os parâmetros do dataQuery agora seguem a ordem dos '?' na query
    const dataParams = [
      codigo_matricula, // para o f.CodigoMatricula no ON
      codAnoLectivo,    // para o mt.ano_lectivo no WHERE
      limit,            // para o LIMIT
      skip              // para o OFFSET
    ];
    
    // Execução da contagem
    const totalResult = await this.dataSource.query(countQuery, countParams);
    const total = parseInt(totalResult[0]?.total || 0, 10);

    // Execução dos dados
    const items = await this.dataSource.query(dataQuery, dataParams);

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
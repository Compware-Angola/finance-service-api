import { Injectable } from '@nestjs/common';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { DataSource, Repository } from 'typeorm';
import { MonthlyFeesFilterDto } from './dto/monthly-fees-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';

@Injectable()
export class MonthlyFeesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,
  ) {}
async findMonthlyFees(paginationQuery: MonthlyFeesFilterDto): Promise<PagedResult<any>> {
  const { limit = 10, page = 1, codigo_matricula, codAnoLectivo } = paginationQuery;

  if (!codigo_matricula || !codAnoLectivo) {
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  const skip = (page - 1) * limit;

  // 1. CONTAGEM SEGURA
  const countQuery = this.mesTempRepo
    .createQueryBuilder('mt')
    .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.mes_temp_id = mt.id')
    .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = fi.CodigoFactura')
    .where('REGEXP_LIKE(TRIM(mt.ano_lectivo), \'^[0-9]+$\')')
    .andWhere('REGEXP_LIKE(TRIM(f.CodigoMatricula), \'^[0-9]+$\')')
    .andWhere('NVL(TO_NUMBER(TRIM(mt.ano_lectivo)), 0) = :ano', { ano: codAnoLectivo })
    .andWhere('NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) = :matricula', { matricula: codigo_matricula })
    .andWhere('NVL(TO_CHAR(f.estado), \'0\') != :estado', { estado: '3' })
    .select('COUNT(DISTINCT mt.id)', 'total');

  const totalResult = await countQuery.getRawOne();
  const total = Number(totalResult?.total || 0);
  const totalPages = Math.ceil(total / limit);

  if (total === 0) {
    return { data: [], total, page, limit, totalPages };
  }

  // 2. CONSULTA PAGINADA – TUDO EM snake_case + "aspas"
  const dataQuery = this.mesTempRepo
    .createQueryBuilder('mt')
    .select([
      'mt.id AS "mes_temp_id"',
      'mt.designacao AS "mes"',
      'mt.data_inicial AS "data_inicial"',
      'mt.data_final AS "data_final"',
      'mt.data_limite AS "data_limite"',
      'mt.data_final_desconto AS "data_final_desconto"',
      'fi.codigo AS "id_item"',
      'fi.CodigoProduto AS "id_tipo_servico"',
      'ts.Descricao AS "descricao_servico"',
      'ts.TipoServico AS "tipo_servico"',
      'NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) AS "codigo_matricula"',
      'NVL(TO_NUMBER(TRIM(f.ano_lectivo)), 0) AS "ano_lectivo_fatura"',
      'NVL(TO_CHAR(f.estado), \'0\') AS "estado_fatura"',
      'f.Referencia AS "reference"',
      'f.dataVencimento AS "data_vencimento"',
      'f.Codigo AS "codigo_factura"',
      'f.TotalPreco AS "total_preco_fatura"',
      'f.Desconto AS "desconto"',
      'fi.Total AS "total_item"',
      'fi.valor_pago AS "valor_pago"',
      'fi.Total AS "total"',
      'fi.preco AS "total_preco"',
      `CASE
         WHEN fi.valor_pago >= fi.Total THEN 1
         WHEN fi.valor_pago > 0 THEN 2
         ELSE 0
       END AS "status_pagamento"`,
    ])
    .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.mes_temp_id = mt.id')
    .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = fi.CodigoFactura')
    .leftJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'fi.CodigoProduto = ts.Codigo')
    .where('REGEXP_LIKE(TRIM(mt.ano_lectivo), \'^[0-9]+$\')')
    .andWhere('REGEXP_LIKE(TRIM(f.CodigoMatricula), \'^[0-9]+$\')')
    .andWhere('NVL(TO_NUMBER(TRIM(mt.ano_lectivo)), 0) = :ano', { ano: codAnoLectivo })
    .andWhere('NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) = :matricula', { matricula: codigo_matricula })
    .andWhere('NVL(TO_CHAR(f.estado), \'0\') != :estado', { estado: '3' })
    .orderBy('mt.ordem_mes', 'ASC')
    .offset(skip)
    .limit(limit);

  const results = await dataQuery.getRawMany();

  return {
    data: results,
    total,
    page,
    limit,
    totalPages,
  };
}
}
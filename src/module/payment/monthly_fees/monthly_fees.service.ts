import { BadRequestException, Injectable } from '@nestjs/common';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { DataSource, Repository } from 'typeorm';
import { MonthlyFeesFilterDto } from './dto/monthly-fees-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';
import { MonthlyFeesStatisticFilterDto } from './dto/monthly-fees-statistic.dto';
import { MonthlyFeesDiscountService } from './monthly_fees.discount.service';

@Injectable()
export class MonthlyFeesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,

    private readonly monthlyFeeDiscount: MonthlyFeesDiscountService,
  ) {}

  async findMonthlyFees(
    paginationQuery: MonthlyFeesFilterDto,
  ): Promise<PagedResult<any>> {
    const {
      limit = 10,
      page = 1,
      codigo_matricula,
      codAnoLectivo,
      status, // ← novo campo opcional no DTO
    } = paginationQuery;

    if (!codigo_matricula || !codAnoLectivo) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;

    // === QUERY DE CONTAGEM ===
    const countQuery = this.mesTempRepo
      .createQueryBuilder('mt')
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.mes_temp_id = mt.id')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = fi.CodigoFactura')
      .where("REGEXP_LIKE(TRIM(mt.ano_lectivo), '^[0-9]+$')")
      .andWhere("REGEXP_LIKE(TRIM(f.CodigoMatricula), '^[0-9]+$')")
      .andWhere('NVL(TO_NUMBER(TRIM(mt.ano_lectivo)), 0) = :ano', {
        ano: codAnoLectivo,
      })
      .andWhere('NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) = :matricula', {
        matricula: codigo_matricula,
      })
      .andWhere("NVL(TO_CHAR(f.estado), '0') != '3'");
    // FILTRO DE STATUS (pago / pendente)
    if (status === 'paid') {
      countQuery.andWhere('fi.valor_pago >= fi.Total');
    } else if (status === 'pending') {
      countQuery.andWhere('fi.valor_pago < fi.Total');
    }

    const totalResult = await countQuery
      .select('COUNT(DISTINCT mt.id)', 'total')
      .getRawOne();
    const total = Number(totalResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    // if (total === 0) {
    //   return { data: [], total, page, limit, totalPages };
    // }

    // === QUERY PRINCIPAL (com os dados) ===
    const dataQuery = this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.id AS "mes_temp_id"',
        'mt.designacao AS "mes"',
        'mt.data_inicial AS "data_inicial"',
        'mt.data_final AS "data_final"',
        'mt.data_limite AS "data_limite"',
        'mt.semestre AS "semestre"',
        'mt.data_final_desconto AS "data_final_desconto"',
        'fi.codigo AS "id_item"',
        'fi.CodigoProduto AS "id_tipo_servico"',
        'ts.Descricao AS "descricao_servico"',
        'ts.TipoServico AS "tipo_servico"',
        'NVL(fi.preco, ts.Preco)   AS "mensalidade"',
        'NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) AS "codigo_matricula"',
        'NVL(TO_NUMBER(TRIM(f.ano_lectivo)), 0) AS "ano_lectivo_fatura"',
        'NVL(TO_CHAR(f.estado), \'0\') AS "estado_fatura"',
        'f.Referencia AS "reference"',
        'f.ValorAPagar As "ValorAPagar"',
        'f.ValorEntregue as "valorEntregue"',
        'f.dataVencimento AS "data_vencimento"',
        'f.Codigo AS "codigo_factura"',
        'f.TotalPreco AS "total_preco_fatura"',
        'fi.descontoProduto AS "desconto"',
        'fi.Multa AS "multa"',
        'fi.Total AS "total_item"',
        'fi.valor_pago AS "valor_pago"',
        'fi.Total AS "total"',
        'fi.preco AS "total_preco"',
        `CASE
         WHEN fi.valor_pago >= fi.Total THEN 1
         WHEN fi.valor_pago > 0 AND fi.valor_pago < fi.Total THEN 2
         ELSE 0
       END AS "status_pagamento"
       `,
      ])

      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.mes_temp_id = mt.id')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = fi.CodigoFactura')
      .leftJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'fi.CodigoProduto = ts.Codigo')
      .where("REGEXP_LIKE(TRIM(mt.ano_lectivo), '^[0-9]+$')")
      .andWhere("REGEXP_LIKE(TRIM(f.CodigoMatricula), '^[0-9]+$')")
      .andWhere('NVL(TO_NUMBER(TRIM(mt.ano_lectivo)), 0) = :ano', {
        ano: codAnoLectivo,
      })
      .andWhere('NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) = :matricula', {
        matricula: codigo_matricula,
      })
      .andWhere("NVL(TO_CHAR(f.estado), '0') != '3'");
    // MESMO FILTRO DE STATUS NA QUERY PRINCIPAL
    if (status === 'paid') {
      dataQuery.andWhere('fi.valor_pago >= fi.Total');
    } else if (status === 'pending') {
      dataQuery.andWhere('fi.valor_pago < fi.Total');
    }

    let results = await dataQuery
      .orderBy('mt.prestacao', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    if (codAnoLectivo <= 22) {
      const generatedPayment = await this.monthlyFeeDiscount.generatePayment({
        codAnoLectivo: codAnoLectivo,
        codigo_matricula: codigo_matricula,
        status: status,
      });
      results.push(...generatedPayment);
    }
    return {
      data: results,
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findMonthlyStatistic({
    codigo_matricula,
  }: MonthlyFeesStatisticFilterDto) {
    const sql = `
      select  sum(f.VALORAPAGAR) as total from
      fk2_mes_temp mt
      inner join fk2_factura_items    fi on fi.mes_temp_id = mt.id
      inner join fk2_factura          f  on f.codigo = fi.CODIGOFACTURA
      inner join FK2_TB_TIPO_SERVICOS ts  on ts.CODIGO = fi.CODIGOPRODUTO
      where 1=1
      and f.CODIGOMATRICULA = :codigo_matricula
      and f.ESTADO != 3
      and fi.valor_pago < fi.Total
    `;
    const result = await this.dataSource.query(sql, {
      codigo_matricula,
    } as any);
    const row = result[0];
    if (!row) {
      return {
        total: 0,
      };
    }
    return {
      total: row.TOTAL,
    };
  }
}

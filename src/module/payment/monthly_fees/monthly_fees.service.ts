import { BadRequestException, Injectable } from '@nestjs/common';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { DataSource, Repository } from 'typeorm';
import { MonthlyFeesFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MesTemp } from '../payment-references/entities/mes-temp.entity';
import { MonthlyFeesStatisticFilterDto } from '../../shared/monthly_fees/dto/monthly-fees-statistic.dto';
import { MonthlyFeesDiscountUtilService } from 'src/module/shared/monthly_fees/monthly_fees.discount.Util.service';

@Injectable()
export class MonthlyFeesService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(MesTemp) private mesTempRepo: Repository<MesTemp>,

    private readonly monthlyFeeDiscount: MonthlyFeesDiscountUtilService,
  ) {}

  async findMonthlyFees(
    paginationQuery: MonthlyFeesFilterDto,
  ): Promise<PagedResult<any>> {
    const {
      limit = 10,
      page = 1,
      codigo_matricula,
      codAnoLectivo,
      status, // 'paid' | 'pending' | undefined
    } = paginationQuery;

    if (!codigo_matricula || !codAnoLectivo) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Verificação rápida de confirmação
    const temConfirmacao = await this.verificarConfirmacao(
      codigo_matricula,
      codAnoLectivo,
    );

    if (!temConfirmacao) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;

    // ====================== QUERY UNIFICADA ======================
    const qb = this.mesTempRepo
      .createQueryBuilder('mt')
      .select([
        'mt.id AS "mes_temp_id"',
        'mt.designacao AS "mes"',
        'mt.data_inicial AS "data_inicial"',
        'mt.data_final AS "data_final"',
        'mt.data_limite AS "data_limite"',
        'mt.semestre AS "semestre"',
        'mt.data_final_desconto AS "data_final_desconto"',
        'mt.prestacao', // usado no order by

        'fi.codigo AS "id_item"',
        'fi.CodigoProduto AS "codigo_servico"',
        'ts.Descricao AS "descricao_servico"',
        'ts.TipoServico AS "tipo_servico"',
        'NVL(ts.Preco, fi.preco) AS "mensalidade"',
        'NVL(fi.descontoProduto, 0) AS "desconto"',
        'fi.Multa AS "multa"',
        'fi.Total AS "total_item"',
        'fi.valor_pago AS "valor_pago"',
        'fi.Total AS "total"',
        'fi.preco AS "total_preco"',

        'NVL(TO_NUMBER(TRIM(f.CodigoMatricula)), 0) AS "codigo_matricula"',
        'NVL(TO_NUMBER(TRIM(f.ano_lectivo)), 0) AS "ano_lectivo_fatura"',
        'f.Referencia AS "reference"',
        'f.ValorAPagar AS "ValorAPagar"',
        'f.ValorEntregue AS "valorEntregue"',
        'f.dataVencimento AS "data_vencimento"',
        'f.Codigo AS "codigo_factura"',
        'f.TotalPreco AS "total_preco_fatura"',
        'NVL(TO_CHAR(f.estado), \'0\') AS "estado_fatura"',
        'pg.data_operacao AS "data_operacao"',
        'pg.Data     AS "data_pagamento"',

        `CASE
         WHEN fi.valor_pago >= fi.Total THEN 1
         WHEN fi.valor_pago > 0 THEN 2
         ELSE 0
       END AS "status_pagamento"`,
      ])
      .innerJoin('UMA_FACTURA_ITEMS', 'fi', 'fi.mes_temp_id = mt.id')
      .innerJoin('UMA_FACTURA', 'f', 'f.Codigo = fi.CodigoFactura')
      .leftJoin('UMA_TB_TIPO_SERVICOS', 'ts', 'fi.CodigoProduto = ts.Codigo')
      .leftJoin('UMA_TB_PAGAMENTOS', 'pg', 'pg.codigo_factura = f.Codigo')
      .where('mt.ano_lectivo = :anoLectivo', { anoLectivo: codAnoLectivo })
      .andWhere('f.CodigoMatricula = :matricula', {
        matricula: codigo_matricula,
      })
      .andWhere('f.estado != 3'); // excluído

    // Filtro de status
    if (status === 'paid') {
      qb.andWhere('f.estado = 1');
    } else if (status === 'pending') {
      qb.andWhere('f.estado = 0');
    }

    // ====================== CONTAGEM ======================
    const total = await qb
      .clone()
      .select('COUNT(DISTINCT mt.id)', 'total')
      .getRawOne()
      .then((r) => Number(r?.total || 0));

    // ====================== DADOS ======================
    const results = await qb
      .orderBy('mt.prestacao', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    // ====================== PAGAMENTOS A GERAR ======================
    let generated: any[] = [];

    // Só busca os a gerar se o status permitir (evita query desnecessária)
    if (!status || status === 'pending' || status === 'all') {
      generated = await this.monthlyFeeDiscount.generatePayment({
        codAnoLectivo,
        codigo_matricula,
        status: status || 'pending', // só os pendentes por padrão
      });
    }

    // Concatena os resultados
    const data = [...results, ...generated];

    return {
      data,
      total: total + generated.length,
      page,
      limit,
      totalPages: Math.ceil((total + generated.length) / limit),
    };
  }
  async verificarConfirmacao(codigoMatricula: number, anoLectivo: number) {
    const sql = `
      select codigo
      from fk2_tb_confirmacoes
      where 1=1
      and codigo_matricula = :codigoMatricula
      and codigo_ano_lectivo = :anoLectivo
    `;
    const result = await this.dataSource.query(sql, {
      codigoMatricula: codigoMatricula,
      anoLectivo: anoLectivo,
    } as any);

    if (!result || result.length == 0) {
      return false;
    }
    return true;
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

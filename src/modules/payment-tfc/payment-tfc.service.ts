import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindPaymentTFCDTO } from './dto/find-payment-tfc.dto';

@Injectable()
export class PaymentTfcService {
  constructor(private dataSource: DataSource) {}
  async findPagamentosTFC(filters: FindPaymentTFCDTO) {
    const {
      anoLectivo,
      curso,
      periodoId,
      page = 1,
      status,
      limit = 25,
      matriculaId,
      facturaId,
      pagamentoId,
      nome,
    } = filters;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`s.sigla = :sigla`);
    params.sigla = 'JdMdFdC';

    if (anoLectivo) {
      conditions.push(`f.ANO_LECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }

    if (curso) {
      conditions.push(`tm.Codigo_Curso = :curso`);
      params.curso = curso;
    }

    if (periodoId) {
      conditions.push(`tprd.codigo = :periodoId`);
      params.periodoId = periodoId;
    }

    // Estado Factura
    if (status) {
      conditions.push(`f.estado = :status`);
      params.status = status;
    }

    if (nome) {
      conditions.push(`
      fn_remove_acentos(UPPER(tp.NOME_COMPLETO))
      LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'
    `);
      params.nome = nome;
    }

    if (matriculaId) {
      conditions.push(`tm.codigo = :matriculaId`);
      params.matriculaId = matriculaId;
    }

    if (facturaId) {
      conditions.push(`f.codigo = :facturaId`);
      params.facturaId = facturaId;
    }

    if (pagamentoId) {
      conditions.push(`p.codigo = :pagamentoId`);
      params.pagamentoId = pagamentoId;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT
      tp.NOME_COMPLETO AS nome,
      tm.codigo AS matricula,
      p.codigo AS pagamento,
      tc.designacao AS curso,
      f.estado AS estado,
      f.codigo as codigo_factura

    FROM FK2_FACTURA f
      LEFT JOIN FK2_TB_PAGAMENTOS p ON p.CODIGO_FACTURA = f.codigo
      INNER JOIN FK2_FACTURA_ITEMS it ON it.CODIGOFACTURA = f.codigo
      INNER JOIN FK2_TB_TIPO_SERVICOS s ON s.codigo = it.CODIGOPRODUTO
      INNER JOIN FK2_TB_MATRICULAS tm ON tm.Codigo = f.CodigoMatricula
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      INNER JOIN FK2_TB_PERIODOS tprd ON tprd.Codigo = tp.Codigo_Turno
    WHERE ${whereClause}
    ORDER BY tm.codigo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_FACTURA f
      LEFT JOIN FK2_TB_PAGAMENTOS p ON p.CODIGO_FACTURA = f.codigo
      INNER JOIN FK2_FACTURA_ITEMS it ON it.CODIGOFACTURA = f.codigo
      INNER JOIN FK2_TB_TIPO_SERVICOS s ON s.codigo = it.CODIGOPRODUTO
      INNER JOIN FK2_TB_MATRICULAS tm ON tm.Codigo = f.CodigoMatricula
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      INNER JOIN FK2_TB_PERIODOS tprd ON tprd.Codigo = tp.Codigo_Turno
    WHERE ${whereClause}
  `;
    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}

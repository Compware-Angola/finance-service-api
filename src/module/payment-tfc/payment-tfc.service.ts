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
      nome,
    } = filters;
    const offset = (page - 1) * limit;

    let baseWhere = `
    s.sigla = 'JdMdFdC'
    AND f.ANO_LECTIVO = ${anoLectivo}
  `;

    if (curso) {
      baseWhere += ` AND tm.Codigo_Curso = ${curso}`;
    }
    if (periodoId) {
      baseWhere += ` AND tprd.codigo = ${periodoId}`;
    }

    //Estado Factura
    if (status) {
      baseWhere += ` AND f.estado = ${status}`;
    }
    //fn_remove_acentos(UPPER(p.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'
    if (nome) {
      baseWhere += ` AND fn_remove_acentos(UPPER(tp.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER('${nome}')) || '%'`;
    }
    if (matriculaId) {
      baseWhere += ` AND tm.codigo  = ${matriculaId}`;
    }

    const sql = `
    SELECT
      tp.NOME_COMPLETO AS nome,
      tm.codigo AS matricula,
      p.codigo AS pagamento,
      tc.designacao AS curso,
      f.estado AS estado
    FROM FK2_FACTURA f
      LEFT JOIN FK2_TB_PAGAMENTOS p ON p.CODIGO_FACTURA = f.codigo
      INNER JOIN FK2_FACTURA_ITEMS it ON it.CODIGOFACTURA = f.codigo
      INNER JOIN FK2_TB_TIPO_SERVICOS s ON s.codigo = it.CODIGOPRODUTO
      INNER JOIN FK2_TB_MATRICULAS tm ON tm.Codigo = f.CodigoMatricula
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      INNER JOIN FK2_TB_PERIODOS tprd ON tprd.Codigo = tp.Codigo_Turno
    WHERE ${baseWhere}
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
    WHERE ${baseWhere}
  `;
    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
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

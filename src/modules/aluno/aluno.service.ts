import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindMatriculaDto } from './dto/find-matricula.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindMovimentoContaEstudanteDTO } from './dto/find-movimento-conta-estudante.dto';

@Injectable()
export class AlunoService {
  constructor(private readonly dataSource: DataSource) {}

  async findAlunoByMatriculaCodigo({ codigo }: FindMatriculaDto) {
    const sql = `
      SELECT
        p.NOME_COMPLETO        as nome_completo,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        pe.DESIGNACAO          AS periodo,
        m.ESTADO_MATRICULA     AS estado_matricula
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_ADMISSAO     a  ON a.codigo = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p  ON p.codigo = a.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS       c  ON c.codigo = m.CODIGO_CURSO
      INNER JOIN FK2_TB_PERIODOS     pe ON pe.codigo = p.CODIGO_TURNO
      WHERE m.codigo = ${codigo}
    `;

    const result = await this.dataSource.query(sql);

    if (!result || result.length === 0) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const aluno = result[0];

    if (aluno?.ESTADO_MATRICULA?.toLowerCase() === 'diplomado') {
      throw new BadRequestException('Aluno diplomado');
    }

    return toLowerCaseKeys(aluno);
  }

  async findAlunoPreinscricaoByMatricula(codigo) {
    const sql = `select p.codigo from fk2_tb_matriculas    m
      inner join FK2_TB_ADMISSAO         a on a.codigo = m.CODIGO_ALUNO
      inner join FK2_TB_PREINSCRICAO     p on p.codigo = a.PRE_INCRICAO
      where m.codigo =  ${codigo}`;
    const result = await this.dataSource.query(sql);
    if (!result || result.length === 0) {
      throw new NotFoundException('Aluno não encontrado');
    }
    const preInscricao = result[0];
    return preInscricao;
  }
  async findMovimentoContaEstudante(
    codigoMatricula: number,
    filters: FindMovimentoContaEstudanteDTO,
  ) {
    const { page = 1, limit = 10 } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = { offset, limit };

    if (codigoMatricula) {
      conditions.push(`hm.MATRICULA = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }

    const whereClause =
      conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const baseQuery = `
    FROM FK2_HISTORICO_MOVIMENTO_CONTA_ESTUDANTE hm
    WHERE hm.ESTADO <> 1
    ${whereClause}
  `;

    const sql = `
    SELECT
      hm.REFERENCIA,
      hm.DATA_MOVIMENTO,
      hm.CREDITO,
      hm.DEBITO,
      hm.ESTADO,
      hm.MATRICULA,
      hm.SALDO_OPERACAO,
      hm.SALDO_GERAL,
      hm.CODIGOTIPOMOVIMENTO,
      hm.CODIGOMOTIVO,
      hm.CODIGOUTILIZADOR,
      hm.OBSERVACAO,
      hm.FACTURA,
      hm.CODIGO,
      hm.VALOR_EXCEDENTE
    ${baseQuery}
    ORDER BY hm.CODIGO DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(1) AS TOTAL
    ${baseQuery}

  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, { codigoMatricula } as any),
    ]);

    const total = Number(countResult[0].TOTAL);

    return {
      data: toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findSaldoContaEstudante(codigoMatricula: number) {
    const sql = `select p.saldo from fk2_tb_matriculas    m
      inner join FK2_TB_ADMISSAO         a on a.codigo = m.CODIGO_ALUNO
      inner join FK2_TB_PREINSCRICAO     p on p.codigo = a.PRE_INCRICAO
      where m.codigo =  :codigoMatricula`;
    const result = await this.dataSource.query(sql, { codigoMatricula } as any);
    const saldo = Number(result?.[0]?.SALDO ?? 0);
    return {
      saldo,
    };
  }
}

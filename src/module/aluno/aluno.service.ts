import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindMatriculaDto } from './dto/find-matricula.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

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
    console.log(aluno);

    if (aluno?.ESTADO_MATRICULA?.toLowerCase() === 'diplomado') {
      throw new BadRequestException('Aluno diplomado');
    }

    return toLowerCaseKeys(aluno);
  }
}

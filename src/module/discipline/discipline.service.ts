import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';

@Injectable()
export class DisciplineService {
  constructor(private readonly dataSource: DataSource) {}
  async findGradeCurricularAluno({
    matriculaId,
    semestre,
    anoLectivo,
    limit = 25,
    page = 1,
  }: FindDisciplinaAlunoDTO) {
    const offset = (page - 1) * limit;

    const baseWhere = `
    al.codigo_matricula = ${matriculaId}
    AND g.status_ = 1
    AND cfr.codigo_ano_lectivo = ${anoLectivo}
    ${semestre ? `AND s.codigo = ${semestre}` : ''}
  `;

    const sql = `
    SELECT DISTINCT
      d.designacao        AS disciplina,
      d.codigo_disciplina AS codigo_disciplina,
      s.designacao        AS semestre,
      dur.designacao      AS duracao,
      c.designacao        AS classe,
      ano.designacao      AS ano_lectivo,
      hr.designacao       AS horario,
      sl.designacao       AS sala
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
      INNER JOIN FK2_TB_GRADE_CURRICULAR g
              ON al.CODIGO_GRADE_CURRICULAR = g.codigo
      INNER JOIN FK2_TB_DISCIPLINAS d
              ON d.codigo = g.codigo_disciplina
      INNER JOIN FK2_TB_CLASSES c
              ON c.codigo = g.codigo_classe
      INNER JOIN FK2_TB_CURSOS cur
              ON cur.codigo = g.codigo_curso
      INNER JOIN FK2_TB_SEMESTRES s
              ON s.codigo = g.codigo_semestre
      INNER JOIN FK2_TB_DURACAO dur
              ON dur.codigo = d.duracao
      INNER JOIN FK2_TB_CONFIRMACOES cfr
              ON cfr.codigo = al.codigo_confirmacao
      INNER JOIN FK2_TB_ANO_LECTIVO ano
              ON ano.codigo = cfr.codigo_ano_lectivo
      LEFT JOIN FK2_MGH_TB_HORARIO hr
              ON hr.pk_horario = json_value(al.ref_horario, '$.pk')
      LEFT JOIN FK2_MGH_TB_AULA au
              ON au.fk_horario = hr.pk_horario
      LEFT JOIN FK2_TB_SALAS sl
              ON sl.codigo = json_value(au.ref_sala, '$.pk')
    WHERE ${baseWhere}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT d.codigo_disciplina
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
        INNER JOIN FK2_TB_GRADE_CURRICULAR g
                ON al.CODIGO_GRADE_CURRICULAR = g.codigo
        INNER JOIN FK2_TB_DISCIPLINAS d
                ON d.codigo = g.codigo_disciplina
        INNER JOIN FK2_TB_SEMESTRES s
                ON s.codigo = g.codigo_semestre
        INNER JOIN FK2_TB_CONFIRMACOES cfr
                ON cfr.codigo = al.codigo_confirmacao
      WHERE ${baseWhere}
    )
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

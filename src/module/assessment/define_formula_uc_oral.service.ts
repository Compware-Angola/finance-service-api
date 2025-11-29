import { Injectable } from '@nestjs/common';
import { DefinirOralGradeDto } from './dto/definir-oral-grade.dto';
import { ListarDefinirOralDto } from './dto/listar-definir-oral.dto';
import { DataSource } from 'typeorm';
import { AtualizarStatusOralDto } from './dto/atualizar-status-oral.dto';

@Injectable()
export class DefineFormulaUcOralService {
    constructor(private readonly dataSource: DataSource) {}

  async buscar(params: ListarDefinirOralDto): Promise<DefinirOralGradeDto[]> {
    const { cursoId, anoCurricular, semestre } = params;

    const sql = `
      SELECT 
        tgc.CODIGO AS grade,
        td.DESIGNACAO AS disciplina,
        NVL(tgcdo.HABILITAR, 0) AS habilitar
      FROM FK2_TB_GRADE_CURRICULAR tgc
      LEFT JOIN FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL tgcdo 
        ON tgcdo.CODIGOGRADECURRICULAR = tgc.CODIGO
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.CODIGO = tgc.CODIGO_DISCIPLINA
      WHERE tgc.CODIGO_CURSO = ${cursoId}
        AND tgc.CODIGO_CLASSE = ${anoCurricular}
        AND tgc.CODIGO_SEMESTRE = ${semestre}
      ORDER BY td.DESIGNACAO
    `;

    const resultado = await this.dataSource.query(sql);

    return resultado.map((row: any) =>
      new DefinirOralGradeDto(
        row.GRADE,
        row.DISCIPLINA,
        row.HABILITAR === 1, // Oracle devolve 1/0
      ),
    );
  }
  async atualizarStatus(dto: AtualizarStatusOralDto): Promise<void> {
  const { codigoGrade, habilitar } = dto;

  const sql = `
    MERGE INTO FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL t
    USING (SELECT ${codigoGrade} AS CODIGOGRADECURRICULAR FROM DUAL) s
    ON (t.CODIGOGRADECURRICULAR = s.CODIGOGRADECURRICULAR)
    WHEN MATCHED THEN
      UPDATE SET t.HABILITAR = ${habilitar ? 1 : 0}
    WHEN NOT MATCHED THEN
      INSERT (CODIGOGRADECURRICULAR, HABILITAR)
      VALUES (${codigoGrade}, ${habilitar ? 1 : 0})
  `;

  await this.dataSource.query(sql);
}
}

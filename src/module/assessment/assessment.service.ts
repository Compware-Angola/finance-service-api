// src/assessment/assessment.service.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BuscarDisciplinasProvaDto, FiltroNota } from './dto/buscar-disciplinas-prova.dto';

export interface LancamentoNotaPorCursoModel {
  disciplina: string;
  turmaOuHorario: string;
  semestre: string;
  cor: string; // ex: 'green', 'orange', 'red' ou 'rgba(0,255,0,0.2)'
  codigoTurmaHorario: number;
  codigoGrade: number;
  numNotaLancada: number;
}

@Injectable()
export class AssessmentService {
  constructor(private readonly dataSource: DataSource) {}

  async buscarDisciplinasProva(
    params: BuscarDisciplinasProvaDto,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const {
      verHorario = false,
      filtro = FiltroNota.TODAS,
      gradeSelecionada,
      cursoSelecionado,
      anoCurricularSelecionado,
      semestreSelecionado,
      anoLectivoSelecionado,
      tipoAvaliacaoSelecionada,
    } = params;

    const semestre = this.parseSemestre(semestreSelecionado);
    const anoLectivoId = anoLectivoSelecionado!;
    const tipoAvaliacaoId = tipoAvaliacaoSelecionada!;

    if (verHorario && gradeSelecionada) {
      // === MODO HORÁRIO ===
      switch (filtro) {
        case FiltroNota.TODAS:
          return this.findByTodasHorario(gradeSelecionada, anoCurricularSelecionado!, semestre, anoLectivoId, tipoAvaliacaoId);

        case FiltroNota.COM_NOTA:
          return this.findByComNotaHorario(gradeSelecionada, semestre, anoLectivoId, tipoAvaliacaoId);

        case FiltroNota.SEM_NOTA:
          return this.findBySemNotaHorario(gradeSelecionada, semestre, anoLectivoId, tipoAvaliacaoId);

        default:
          return [];
      }
    } else if (cursoSelecionado) {
      // === MODO CURSO/TURMA ===
      switch (filtro) {
        case FiltroNota.TODAS:
          return this.findByTodas(cursoSelecionado, anoCurricularSelecionado!, semestre, anoLectivoId, tipoAvaliacaoId);

        case FiltroNota.COM_NOTA:
          return this.findByComNota(cursoSelecionado, anoCurricularSelecionado!, semestre, anoLectivoId, tipoAvaliacaoId);

        case FiltroNota.SEM_NOTA:
          return this.findBySemNota(cursoSelecionado, anoCurricularSelecionado!, semestre, anoLectivoId, tipoAvaliacaoId);

        default:
          return [];
      }
    }

    return [];
  }

  // ==================== POR HORÁRIO ====================

  private async findByTodasHorario(
    gradeId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        mth.pk_horario AS codigoHorario,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        td.codigo AS codigoDisciplina,
        mth.designacao AS turmaOuHorario
      FROM tb_grade_curricular tgc
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN mgh_tb_horario mth ON JSON_EXTRACT(mth.ref_grade_curricular, '$.pk') = tgc.Codigo
      WHERE tgc.Codigo = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND tgc.Codigo_Classe = ?
        AND JSON_EXTRACT(mth.ref_ano_lectivo, '$.pk') = ?
        AND tgc.status != 0
        AND mth.active_state = 1
        AND mth.fk_estado_horario_wf != 4
      ORDER BY td.Designacao
    `, [gradeId, semestre, classeId, anoLectivoId]);

    return this.enriquecerHorario(rows, semestre, anoLectivoId, tipoAvaliacaoId);
  }

  private async findByComNotaHorario(
    gradeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        mth.pk_horario AS codigoHorario,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        td.codigo AS codigoDisciplina,
        mth.designacao AS turmaOuHorario
      FROM tb_grade_curricular_aluno_avaliacoes tgcaa
      INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN tb_grade_curricular tgc ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN mgh_tb_horario mth ON mth.pk_horario = JSON_EXTRACT(tgca.ref_horario, '$.pk')
      WHERE tgc.Codigo = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND JSON_EXTRACT(mth.ref_ano_lectivo, '$.pk') = ?
        AND tgc.status != 0
        AND mth.active_state = 1
        AND mth.fk_estado_horario_wf != 4
        AND tgcaa.tipo_avaliacao = ?
      ORDER BY td.Designacao
    `, [gradeId, semestre, anoLectivoId, tipoAvaliacaoId]);

    return this.enriquecerHorario(rows, semestre, anoLectivoId, tipoAvaliacaoId, true);
  }

  private async findBySemNotaHorario(
    gradeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        mth.pk_horario AS codigoHorario,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        mth.designacao AS turmaOuHorario
      FROM tb_grade_curricular tgc
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN mgh_tb_horario mth ON JSON_EXTRACT(mth.ref_grade_curricular, '$.pk') = tgc.Codigo
      WHERE tgc.Codigo = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND JSON_EXTRACT(mth.ref_ano_lectivo, '$.pk') = ?
        AND tgc.status != 0
        AND mth.active_state = 1
        AND mth.fk_estado_horario_wf != 4
        AND mth.pk_horario NOT IN (
          SELECT JSON_EXTRACT(tgca.ref_horario, '$.pk')
          FROM tb_grade_curricular_aluno_avaliacoes tgcaa
          INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
          WHERE tgcaa.tipo_avaliacao = ?
            AND JSON_EXTRACT(tgca.ref_horario, '$.pk') IS NOT NULL
        )
      ORDER BY td.Designacao
    `, [gradeId, semestre, anoLectivoId, tipoAvaliacaoId]);

    return rows.map(row => ({
      disciplina: row.disciplina,
      turmaOuHorario: row.turmaOuHorario,
      semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
      cor: 'rgba(255,0,0,0.1)',
      codigoTurmaHorario: row.codigoHorario,
      codigoGrade: row.codigoGrade,
      numNotaLancada: 0,
    }));
  }

  // ==================== POR CURSO/TURMA ====================

  private async findByTodas(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        tt.codigo AS codigoTurma,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        tt.Designacao AS turmaOuHorario
      FROM tb_grade_curricular tgc
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN tb_turmas tt ON tt.Codigo_Curso = tgc.Codigo_Curso AND tt.Codigo_Classe = tgc.Codigo_Classe
      WHERE tgc.Codigo_Curso = ?
        AND tgc.Codigo_Classe = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND tt.Codigo_AnoLectivo = ?
        AND tgc.status != 0
      ORDER BY td.Designacao
    `, [cursoId, classeId, semestre, anoLectivoId]);

    return this.enriquecerTurma(rows, cursoId, classeId, semestre, anoLectivoId, tipoAvaliacaoId);
  }

  private async findByComNota(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        tt.codigo AS codigoTurma,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        tt.Designacao AS turmaOuHorario
      FROM tb_grade_curricular_aluno_avaliacoes tgcaa
      INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN tb_grade_curricular tgc ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN tb_turmas tt ON tt.Codigo = tgca.turma
      WHERE tt.Codigo_Curso = ?
        AND tt.Codigo_Classe = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND tt.Codigo_AnoLectivo = ?
        AND tgcaa.tipo_avaliacao = ?
        AND tgc.status != 0
      ORDER BY td.Designacao
    `, [cursoId, classeId, semestre, anoLectivoId, tipoAvaliacaoId]);

    return this.enriquecerTurma(rows, cursoId, classeId, semestre, anoLectivoId, tipoAvaliacaoId, true);
  }

  private async findBySemNota(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT
        tt.codigo AS codigoTurma,
        tgc.Codigo AS codigoGrade,
        td.Designacao AS disciplina,
        tt.Designacao AS turmaOuHorario
      FROM tb_grade_curricular tgc
      INNER JOIN tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN tb_turmas tt ON tt.Codigo_Curso = tgc.Codigo_Curso AND tt.Codigo_Classe = tgc.Codigo_Classe
      WHERE tgc.Codigo_Curso = ?
        AND tgc.Codigo_Classe = ?
        AND (tgc.Codigo_Semestre = ? OR td.duracao = 2)
        AND tt.Codigo_AnoLectivo = ?
        AND tgc.status != 0
        AND tt.codigo NOT IN (
          SELECT tgca.turma
          FROM tb_grade_curricular_aluno_avaliacoes tgcaa
          INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
          INNER JOIN tb_grade_curricular tgc2 ON tgc2.Codigo = tgca.codigo_grade_curricular
          WHERE tgc2.Codigo_Disciplina = td.codigo
            AND tgcaa.tipo_avaliacao = ?
        )
      ORDER BY td.Designacao
    `, [cursoId, classeId, semestre, anoLectivoId, tipoAvaliacaoId]);

    return rows.map(row => ({
      disciplina: row.disciplina,
      turmaOuHorario: row.turmaOuHorario,
      semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
      cor: 'rgba(255,0,0,0.1)',
      codigoTurmaHorario: row.codigoTurma,
      codigoGrade: row.codigoGrade,
      numNotaLancada: 0,
    }));
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async enriquecerHorario(
    rows: any[],
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
    comNotaGarantida = false,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const result: LancamentoNotaPorCursoModel[] = [];

    for (const row of rows) {
      const totalLancadas = await this.countNotasLancadasHorario(
        row.codigoHorario,
        row.codigoDisciplina || 0,
        tipoAvaliacaoId,
      );

      const cor = await this.calcularCorHorario(row.codigoHorario, row.codigoDisciplina, tipoAvaliacaoId);

      result.push({
        disciplina: row.disciplina,
        turmaOuHorario: row.turmaOuHorario,
        semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
        cor,
        codigoTurmaHorario: row.codigoHorario,
        codigoGrade: row.codigoGrade,
        numNotaLancada: totalLancadas,
      });
    }

    return result;
  }

  private async enriquecerTurma(
    rows: any[],
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
    comNotaGarantida = false,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const result: LancamentoNotaPorCursoModel[] = [];

    for (const row of rows) {
      const totalLancadas = await this.countNotasLancadasTurma(
        cursoId,
        classeId,
        semestre,
        anoLectivoId,
        row.codigoTurma,
        row.codigoDisciplina || 0,
        tipoAvaliacaoId,
      );

      const cor = comNotaGarantida ? 'rgba(0,255,0,0.2)' : await this.calcularCorTurma(row.codigoTurma, row.codigoDisciplina, tipoAvaliacaoId);

      result.push({
        disciplina: row.disciplina,
        turmaOuHorario: row.turmaOuHorario,
        semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
        cor,
        codigoTurmaHorario: row.codigoTurma,
        codigoGrade: row.codigoGrade,
        numNotaLancada: totalLancadas,
      });
    }

    return result;
  }

  private async countNotasLancadasHorario(horarioId: number, disciplinaId: number, tipoAvaliacaoId: number): Promise<number> {
    const [res] = await this.dataSource.query(`
      SELECT COUNT(*) AS total
      FROM tb_grade_curricular_aluno_avaliacoes tgcaa
      INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN tb_grade_curricular tgc ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN mgh_tb_horario mth ON mth.pk_horario = JSON_EXTRACT(tgca.ref_horario, '$.pk')
      WHERE mth.pk_horario = ? AND tgc.Codigo_Disciplina = ? AND tgcaa.tipo_avaliacao = ?
    `, [horarioId, disciplinaId, tipoAvaliacaoId]);
    return Number(res?.total || 0);
  }

  private async countNotasLancadasTurma(
    cursoId: number, classeId: number, semestre: number, anoLectivoId: number,
    turmaId: number, disciplinaId: number, tipoAvaliacaoId: number,
  ): Promise<number> {
    const [res] = await this.dataSource.query(`
      SELECT COUNT(*) AS total
      FROM tb_grade_curricular_aluno_avaliacoes tgcaa
      INNER JOIN tb_grade_curricular_aluno tgca ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN tb_turmas tt ON tt.Codigo = tgca.turma
      WHERE tt.Codigo_Curso = ? AND tt.Codigo_Classe = ?
        AND tt.Codigo_AnoLectivo = ? AND tgcaa.tipo_avaliacao = ?
        AND tgca.turma = ? AND tgca.codigo_grade_curricular IN (
          SELECT Codigo FROM tb_grade_curricular WHERE Codigo_Disciplina = ? AND Codigo_Semestre = ?
        )
    `, [cursoId, classeId, anoLectivoId, tipoAvaliacaoId, turmaId, disciplinaId, semestre]);
    return Number(res?.total || 0);
  }

  private async calcularCorHorario(horarioId: number, disciplinaId: number, tipoAvaliacaoId: number): Promise<string> {
    const totalAlunos = await this.dataSource.query(`SELECT COUNT(*) AS total FROM tb_matricula WHERE fk_horario = ?`, [horarioId]);
    const totalLancadas = await this.countNotasLancadasHorario(horarioId, disciplinaId, tipoAvaliacaoId);
    const percent = totalAlunos[0]?.total > 0 ? (totalLancadas / totalAlunos[0].total) * 100 : 0;

    if (percent >= 95) return 'green';
    if (percent >= 50) return 'orange';
    return 'red';
  }

  private parseSemestre(semestre?: string): number {
    if (!semestre) return 1;
    return /1|i/i.test(semestre) ? 1 : 2;
  }
  private async calcularCorTurma(
  turmaId: number,
  disciplinaId: number,
  tipoAvaliacaoId: number,
): Promise<string> {
  // Conta total de alunos na turma dessa disciplina
  const [totalAlunosRow] = await this.dataSource.query(`
    SELECT COUNT(*) AS total
    FROM tb_matricula m
    INNER JOIN tb_turmas t ON t.codigo = m.fk_turma
    INNER JOIN tb_grade_curricular_aluno gca ON gca.fk_matricula = m.codigo
    INNER JOIN tb_grade_curricular gc ON gc.Codigo = gca.codigo_grade_curricular
    WHERE t.codigo = ? AND gc.Codigo_Disciplina = ?
  `, [turmaId, disciplinaId]);

  const totalLancadas = await this.countNotasLancadasTurma(
    0, 0, 0, 0, turmaId, disciplinaId, tipoAvaliacaoId // curso/classe/semestre/ano não usados aqui
  );

  const totalAlunos = Number(totalAlunosRow?.total || 0);
  if (totalAlunos === 0) return 'red';

  const percentagem = (totalLancadas / totalAlunos) * 100;

  if (percentagem >= 95) return 'green';
  if (percentagem >= 50) return 'orange';
  return 'red';
}
}
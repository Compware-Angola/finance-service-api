// src/assessment/assessment.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AnoLectivoUtil } from '../util/current-academic-year';
import { BuscarNotasDto } from './dto/buscar-notas.dto';
import { BuscarDisciplinasProvaDto, FiltroNota } from './dto/buscar-disciplinas-prova.dto';

export interface LancamentoNotaPorCursoModel {
  disciplina: string;
  turmaOuHorario: string;
  semestre: string;
  cor: string; // ex: 'green', 'orange', 'red' ou 'rgba(0,255,0,0.2)'
  codigoTurmaHorario: number;
  codigoGrade: number;
  numNotaLancada: number;
  numeroDeIscritos: number;
  numNotaPorLancar: number;
}
// src/assessment/dto/nota-lancada.response.dto.ts

export class NotaLancadaResponseDto {
  alunoId: number;
  alunoNome: string;
  numeroAluno?: string;
  nota: number;
  observacao?: string;
  dataLancamento?: Date;
  // adicione mais campos conforme vierem do banco
}
@Injectable()
export class AssessmentService {
  private anoAtualPrincipal: number;
  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { this.initAnoAtual(); }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }

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
  async buscarNotas(
    turmaOuHorarioId: number,
    params: BuscarNotasDto,
  ): Promise<NotaLancadaResponseDto[]> {
    const { tipoAvaliacaoId, anoLectivoId } = params;

    let result: any[] = [];

    if (anoLectivoId <= 17) {
      result = await this.dataSource.query(`
    SELECT 
      a.codigo           AS "alunoId",
      pi.nome_completo   AS "alunoNome",
      a.CODIGO     AS "numeroAluno",
      tgcaa.nota         AS "nota",
      tgcaa.observacao   AS "observacao",
      tgcaa.CREATED_AT AS "dataLancamento"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
    INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO gca 
      ON gca.codigo = tgcaa.grade_curricular_aluno
    JOIN FK2_TB_MATRICULAS m 
      ON m.codigo = gca.CODIGO_MATRICULA
    JOIN FK2_TB_ADMISSAO a 
      ON a.codigo = m.CODIGO_ALUNO
    JOIN FK2_TB_PREINSCRICAO pi 
      ON pi.codigo = a.PRE_INCRICAO
    JOIN TB_TURMAS t 
      ON t.codigo = m.fk_turma
    WHERE t.codigo = :turmaOuHorarioId
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
      AND t."Codigo_AnoLectivo" = :anoLectivoId
      AND tgcaa.nota IS NOT NULL
    ORDER BY pi.nome_completo
  `, [
        turmaOuHorarioId,
        tipoAvaliacaoId,
        anoLectivoId,]);

    } else {
      // === HORÁRIO (novo) ===
      result = await this.dataSource.query(`
    SELECT 
      a.codigo           AS "alunoId",
      pi.nome_completo   AS "alunoNome",
      a.CODIGO     AS "numeroAluno",
      tgcaa.nota         AS "nota",
      tgcaa.observacao   AS "observacao",
      tgcaa.CREATED_AT AS "dataLancamento"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
    JOIN FK2_TB_GRADE_CURRICULAR_ALUNO gca 
      ON gca.codigo = tgcaa.grade_curricular_aluno
    JOIN FK2_TB_MATRICULAS m 
      ON m.codigo = gca.CODIGO_MATRICULA
    JOIN FK2_TB_ADMISSAO a 
      ON a.codigo = m.CODIGO_ALUNO
    JOIN FK2_TB_PREINSCRICAO pi 
      ON pi.codigo = a.PRE_INCRICAO
    JOIN FK2_MGH_TB_HORARIO h 
      ON h.pk_horario = TO_NUMBER(JSON_VALUE(gca.ref_horario, '$.pk'))
   
    JOIN FK2_TB_GRADE_CURRICULAR_ALUNO gca 
      ON gca.codigo = tgcaa.grade_curricular_aluno
    JOIN FK2_TB_MATRICULAS m 
      ON m.codigo = gca.CODIGO_MATRICULA
    JOIN FK2_TB_ADMISSAO a 
      ON a.codigo = m.CODIGO_ALUNO
    JOIN FK2_TB_PREINSCRICAO pi 
      ON pi.codigo = a.PRE_INCRICAO
    JOIN FK2_MGH_TB_HORARIO h 
      ON h.pk_horario = TO_NUMBER(JSON_VALUE(gca.ref_horario, '$.pk'))
    WHERE h.pk_horario = :turmaOuHorarioId
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
      AND TO_NUMBER(JSON_VALUE(h.ref_ano_lectivo, '$.pk')) = :anoLectivoId
      AND tgcaa.nota IS NOT NULL
    ORDER BY pi.nome_completo
  `, [turmaOuHorarioId,
        tipoAvaliacaoId,
        anoLectivoId,]);
    }

    // Converte o resultado bruto para o DTO (boa prática)
    return result.map(row => ({
      alunoId: Number(row.alunoId),
      alunoNome: row.alunoNome,
      numeroAluno: row.numeroAluno ?? undefined,
      nota: Number(row.nota),
      observacao: row.observacao ?? undefined,
      dataLancamento: row.dataLancamento ? new Date(row.dataLancamento) : undefined,
    }));
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
    FROM FK2_TB_GRADE_CURRICULAR tgc
      INNER JOIN FK2_TB_DISCIPLINAS td ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_MGH_TB_HORARIO mth 
        ON JSON_VALUE(mth.ref_grade_curricular, '$.pk' RETURNING NUMBER) = tgc.Codigo
    WHERE tgc.Codigo = :gradeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND tgc.Codigo_Classe = :classeId
      AND JSON_VALUE(mth.ref_ano_lectivo, '$.pk' RETURNING NUMBER) = :anoLectivoId
    --  AND tgc.status_ != 0
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
      mth.pk_horario AS "codigoHorario",
      tgc.Codigo AS "codigoGrade",
      td.Designacao AS "disciplina",
      td.codigo AS "codigoDisciplina",
      mth.designacao AS "turmaOuHorario"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
        ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
        ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_MGH_TB_HORARIO mth 
        ON mth.pk_horario = JSON_VALUE(tgca.ref_horario, '$.pk' RETURNING NUMBER)
    WHERE tgc.Codigo = :gradeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND JSON_VALUE(mth.ref_ano_lectivo, '$.pk' RETURNING NUMBER) = :anoLectivoId
      AND tgc.status_ != 0
      AND mth.active_state = 1
      AND mth.fk_estado_horario_wf != 4
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
    ORDER BY td.Designacao
  `, [gradeId,
      semestre,
      anoLectivoId,
      tipoAvaliacaoId,]);

    return this.enriquecerHorario(rows, semestre, anoLectivoId, tipoAvaliacaoId);
  }

  // 1. SEM NOTA + HORÁRIO (melhorado)
  private async findBySemNotaHorario(
    gradeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
    SELECT DISTINCT
      mth.pk_horario AS "codigoHorario",
      tgc.Codigo AS "codigoGrade",
      td.Designacao AS "disciplina",
      td.codigo AS "codigoDisciplina",
      mth.designacao AS "turmaOuHorario"
    FROM FK2_TB_GRADE_CURRICULAR tgc
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_MGH_TB_HORARIO mth 
        ON JSON_VALUE(mth.ref_grade_curricular, '$.pk' RETURNING NUMBER) = tgc.Codigo
    WHERE tgc.Codigo = :gradeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND JSON_VALUE(mth.ref_ano_lectivo, '$.pk' RETURNING NUMBER) = :anoLectivoId
      AND tgc.status_ != 0
      AND mth.active_state = 1
      AND mth.fk_estado_horario_wf != 4
      AND NOT EXISTS (
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
          INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
            ON tgca.codigo = tgcaa.grade_curricular_aluno
        WHERE tgcaa.tipo_avaliacao = :tipoAvaliacaoId
          AND JSON_VALUE(tgca.ref_horario, '$.pk' RETURNING NUMBER) = mth.pk_horario
      )
    ORDER BY td.Designacao
  `, [gradeId, semestre, anoLectivoId, tipoAvaliacaoId]);

    return rows.map(row => ({
      disciplina: row.DISCIPLINA,
      turmaOuHorario: row.TURMAOUHORARIO,
      semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
      cor: 'rgba(255,0,0,0.1)',
      codigoTurmaHorario: row.CODIGOHORARIO,
      codigoGrade: row.CODIGOGRADE,
      codigoDisciplina: row.CODIGODISCIPLINA,
      numNotaLancada: 0,
      totalAlunos: 0,
      notasPorLancar: 0,
    }));
  }

  // 2. TODAS + TURMA (melhorado)
  private async findByTodas(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
    SELECT DISTINCT
      tt.codigo AS "codigoTurma",
      tgc.Codigo AS "codigoGrade",
      td.Designacao AS "disciplina",
      td.codigo AS "codigoDisciplina",
      tt.Designacao AS "turmaOuHorario"
    FROM FK2_TB_GRADE_CURRICULAR tgc
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_TB_TURMAS tt 
        ON tt.Codigo_Curso = tgc.Codigo_Curso
       AND tt.Codigo_Classe = tgc.Codigo_Classe
       AND tt.Codigo_AnoLectivo = :anoLectivoId
    WHERE tgc.Codigo_Curso = :cursoId
      AND tgc.Codigo_Classe = :classeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND tgc.status_ != 0
    ORDER BY td.Designacao
  `, [cursoId, classeId, semestre, anoLectivoId]);

    return this.enriquecerTurma(rows, cursoId, classeId, semestre, anoLectivoId, tipoAvaliacaoId);
  }

  // 3. COM NOTA + TURMA (melhorado + corrigido o erro de aspas)
  private async findByComNota(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    tipoAvaliacaoId: number,
  ): Promise<LancamentoNotaPorCursoModel[]> {
    const rows = await this.dataSource.query(`
    SELECT DISTINCT
      tt.codigo AS "codigoTurma",
      tgc.Codigo AS "codigoGrade",
      td.Designacao AS "disciplina",
      td.codigo AS "codigoDisciplina",
      tt.Designacao AS "turmaOuHorario"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
        ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
        ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_TB_TURMAS tt 
        ON tt.Codigo = tgca.turma
    WHERE tt.Codigo_Curso = :cursoId
      AND tt.Codigo_Classe = :classeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND tt.Codigo_AnoLectivo = :anoLectivoId
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
      AND tgc.status_ != 0
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
      tt.codigo AS "codigoTurma",
      tgc.Codigo AS "codigoGrade",
      td.Designacao AS "disciplina",
      td.codigo AS "codigoDisciplina",
      tt.Designacao AS "turmaOuHorario"
    FROM FK2_TB_GRADE_CURRICULAR tgc
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN FK2_TB_TURMAS tt 
        ON tt.Codigo_Curso = tgc.Codigo_Curso 
       AND tt.Codigo_Classe = tgc.Codigo_Classe
       AND tt.Codigo_AnoLectivo = :anoLectivoId
    WHERE tgc.Codigo_Curso = :cursoId
      AND tgc.Codigo_Classe = :classeId
      AND (tgc.Codigo_Semestre = :semestre OR td.duracao = 2)
      AND tgc.status_ != 0
      AND tt.codigo NOT IN (
        SELECT tgca.turma
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
          INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
            ON tgca.codigo = tgcaa.grade_curricular_aluno
          INNER JOIN FK2_TB_GRADE_CURRICULAR tgc2 
            ON tgc2.Codigo = tgca.codigo_grade_curricular
        WHERE tgcaa.tipo_avaliacao = :tipoAvaliacaoId
          AND tgca.turma IS NOT NULL
      )
    ORDER BY td.Designacao
  `, [cursoId,
      classeId,
      semestre,
      anoLectivoId,
      tipoAvaliacaoId,]);

    return rows.map(row => ({
      disciplina: row.DISCIPLINA,
      turmaOuHorario: row.TURMAOUHORARIO,
      semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
      cor: 'rgba(255,0,0,0.1)', // vermelho claro = sem nota
      codigoTurmaHorario: row.CODIGOTURMA,
      codigoGrade: row.CODIGOGRADE,
      codigoDisciplina: row.CODIGODISCIPLINA,
      numNotaLancada: 0,

      notasPorLancar: 0,
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
        row.CODIGOHORARIO,
        row.CODIGODISCIPLINA || 0,
        tipoAvaliacaoId,
      );
      const r = this.normalizeRow(row);
      console.log(r, "TESTE ###$");

      const anoCorrente = this.anoAtualPrincipal;
      const inscritos = await this.buscarNumeroDeIscritos(r, r.turmaouhorario, anoCorrente);
      const numNotaPorLancar = inscritos >= totalLancadas
        ? inscritos - totalLancadas
        : 0;
      result.push({
        disciplina: row.DISCIPLINA,
        turmaOuHorario: row.TURMAOUHORARIO,
        semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
        cor: null!, // comNotaGarantida ? 'rgba(0,255,0,0.2)' : cor,
        codigoTurmaHorario: row.CODIGOHORARIO,
        codigoGrade: row.CODIGOGRADE,
        numeroDeIscritos: inscritos, // --- IGNORE ---
        numNotaPorLancar,
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
        row.CODIGOTURMA,
        row.CODIGODISCIPLINA || 0,
        tipoAvaliacaoId,
      );

      const cor = comNotaGarantida ? 'rgba(0,255,0,0.2)' : await this.calcularCorTurma(row.CODIGOTURMA, row.CODIGODISCIPLINA, tipoAvaliacaoId);
      const r = this.normalizeRow(row);
      const anoCorrente = this.anoAtualPrincipal;
      const inscritos = await this.buscarNumeroDeIscritos(r, r.turmaOuHorario, anoCorrente);
      const numNotaPorLancar = inscritos >= totalLancadas
        ? inscritos - totalLancadas
        : 0;
      result.push({
        disciplina: row.disciplina,
        turmaOuHorario: row.turmaOuHorario,
        semestre: semestre === 1 ? 'I SEMESTRE' : 'II SEMESTRE',
        cor,
        numeroDeIscritos: inscritos, // --- IGNORE ---
        codigoTurmaHorario: row.CODIGOTURMA,
        codigoGrade: row.CODIGOGRADE,
        numNotaPorLancar,
        numNotaLancada: totalLancadas,
      });
    }

    return result;
  }
  private async countNotasLancadasHorario(
    horarioId: number,
    disciplinaId: number,
    tipoAvaliacaoId: number,
  ): Promise<number> {
    const result = await this.dataSource.query(`
    SELECT COUNT(*) AS total
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
        ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
        ON tgc.Codigo = tgca.codigo_grade_curricular
      INNER JOIN FK2_MGH_TB_HORARIO mth 
        ON mth.pk_horario = JSON_VALUE(tgca.ref_horario, '$.pk' RETURNING NUMBER)
    WHERE mth.pk_horario = :horarioId 
      AND tgc.Codigo_Disciplina = :disciplinaId 
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
  `, [horarioId, disciplinaId, tipoAvaliacaoId]);
    console.log(result, "OBRAA");


    return Number(result[0]?.TOTAL || 0);
  }

  private async countNotasLancadasTurma(
    cursoId: number,
    classeId: number,
    semestre: number,
    anoLectivoId: number,
    turmaId: number,
    disciplinaId: number,
    tipoAvaliacaoId: number,
  ): Promise<number> {
    const result = await this.dataSource.query(`
    SELECT COUNT(*) AS "total"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaa
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
        ON tgca.codigo = tgcaa.grade_curricular_aluno
      INNER JOIN FK2_TB_TURMAS tt 
        ON tt.Codigo = tgca.turma
    WHERE tt.Codigo_Curso = :cursoId
      AND tt.Codigo_Classe = :classeId
      AND tt.Codigo_AnoLectivo = :anoLectivoId
      AND tgcaa.tipo_avaliacao = :tipoAvaliacaoId
      AND tgca.turma = :turmaId
      AND tgca.codigo_grade_curricular IN (
        SELECT Codigo 
        FROM FK2_TB_GRADE_CURRICULAR 
        WHERE Codigo_Disciplina = :disciplinaId 
          AND Codigo_Semestre = :semestre
      )
  `, [cursoId, classeId, anoLectivoId, tipoAvaliacaoId, turmaId, disciplinaId, semestre]);

    // result é sempre array com 1 objeto → [ { total: '15' } ]
    const total = result[0]?.total ?? '0';
    return Number(total);
  }
  /*
   private async calcularCorHorario(horarioId: number, disciplinaId: number, tipoAvaliacaoId: number): Promise<string> {
 const result = await this.dataSource.query(
   `SELECT COUNT(*) AS "total" 
    FROM FK2_TB_MATRICULAS 
    WHERE fk_horario = :horarioId`,
  [horarioId]
 );
 
 const totalAlunos = Number(result[0]?.total ?? 0);
     console.log(horarioId,"TESTE !123");
     
     const totalLancadas = await this.countNotasLancadasHorario(horarioId, disciplinaId, tipoAvaliacaoId);
     const percent = totalAlunos[0]?.total > 0 ? (totalLancadas / totalAlunos[0].total) * 100 : 0;
 
     if (percent >= 95) return 'green';
     if (percent >= 50) return 'orange';
     return 'red';
   }
 */
  private parseSemestre(semestre?: string): number {
    if (!semestre) return 1;
    return /1|i/i.test(semestre) ? 1 : 2;
  }
  private async calcularCorTurma(
    turmaId: number,
    disciplinaId: number,
    tipoAvaliacaoId: number,
  ): Promise<'red' | 'orange' | 'green'> {
    // 1. Conta total de alunos na turma com essa disciplina
    const totalAlunosResult = await this.dataSource.query(`
    SELECT COUNT(*) AS "total"
    FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_TURMAS t 
        ON t.codigo = m.fk_turma
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO gca 
        ON gca.CODIGO_MATRICULA = m.codigo
      INNER JOIN FK2_TB_GRADE_CURRICULAR gc 
        ON gc.Codigo = gca.codigo_grade_curricular
    WHERE t.codigo = :turmaId 
      AND gc.Codigo_Disciplina = :disciplinaId
  `, [turmaId, disciplinaId]);

    const totalAlunos = Number(totalAlunosResult[0]?.total ?? 0);
    if (totalAlunos === 0) return 'red';

    // 2. Conta quantas notas já foram lançadas nessa turma/disciplina/avaliação
    const totalLancadas = await this.countNotasLancadasTurma(
      0, 0, 0, 0, // esses campos não são usados quando filtra por turmaId
      turmaId,
      disciplinaId,
      tipoAvaliacaoId,
    );

    // 3. Calcula a porcentagem
    const percentagem = (totalLancadas / totalAlunos) * 100;

    // 4. Define a cor (sem precisar de string solta)
    if (percentagem >= 95) return 'green';
    if (percentagem >= 50) return 'orange';
    return 'red';
  }

  /** Calcula o número de alunos inscritos (funciona para TURMA e HORÁRIO) */
  async buscarNumeroDeIscritos(
    lancamento: LancamentoNotaPorCursoModel | any,
    turmaOuHorario: string,
    anoLectivoAtual: number,
  ): Promise<number> {
    // Anos letivos antigos (≤ 17) → contagem por turma + grade
    if (anoLectivoAtual <= 17) {
      return this.contarInscritosAntigo(
        lancamento.codigograde,
        lancamento.codigohorario,
        anoLectivoAtual,
      );
    }

    // Anos novos (> 17) → contagem por horário (JSON)
    const pkHorario = await this.getPkHorarioAtivo(turmaOuHorario);
    if (!pkHorario) return 0;

    return this.contarInscritosPorHorario(pkHorario, anoLectivoAtual);
  }

  // ==================== MÉTODOS PRIVADOS DE CONTAGEM ====================

  private async contarInscritosAntigo(codigoGrade: number, codigoTurma: number, anoLectivo: number): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(*) AS "total"
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
      WHERE gca.codigo_grade_curricular = :codigoGrade
        AND gca.turma = :codigoTurma
        AND gca.codigo_ano_lectivo = :anoLectivo
        AND gca.codigo_status_grade_curricular IN (2, 3)
    `, [codigoGrade, codigoTurma, anoLectivo]);

    return Number(result[0]?.total ?? 0);
  }

  private async getPkHorarioAtivo(designacao: string): Promise<number | null> {
    const result = await this.dataSource.query(`
      SELECT pk_horario AS "pk"
      FROM FK2_MGH_TB_HORARIO
      WHERE designacao = :designacao
        AND active_state = 1
        AND fk_estado_horario_wf != 4
      ORDER BY pk_horario DESC
    `, [designacao]);

    return result[0]?.pk ?? null;
  }

  private async contarInscritosPorHorario(pkHorario: number, anoLectivo: number): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COUNT(*) AS "total"
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
      WHERE gca.codigo_status_grade_curricular IN (2, 3)
        AND gca.codigo_ano_lectivo = :anoLectivo
        AND JSON_VALUE(gca.ref_horario, '$.pk' RETURNING NUMBER) = :pkHorario
    `, [anoLectivo, pkHorario]);

    return Number(result[0]?.total ?? 0);
  }
  private normalizeRow(row: any): any {
    if (!row) return {};
    const normalized: any = {};
    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        normalized[key.toLowerCase()] = row[key];
      }
    }
    return normalized;
  }
}
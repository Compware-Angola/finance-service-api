import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstudanteLancamentoDto } from './dto/estudante-lancamento.dto';
import { BuscarEstudantesDto } from './dto/buscar-estudantes.dto';

@Injectable()
export class NoteReleaseService {
  constructor(private dataSource: DataSource) { }

  async buscarEstudantes(dto: BuscarEstudantesDto): Promise<EstudanteLancamentoDto[] | any> {
    console.log('Entrou no buscarEstudantes (NestJS)');

    let estudantesComNotas = 0;
    const listaDeAlunos: EstudanteLancamentoDto[] = [];

    let grade: any;
    let planoCurricularCursoCodigo: any;
    let planoCurricularGrade: any;

    const {
      gradeId,
      tipoAvaliacaoId,
      tipoProvaId,
      anoLectivoId,
      verHorario,
      turmaId,
      horarioId,
    } = dto;

    // PASSO 1 – Grade curricular
    grade = await this.buscarGradePorId(gradeId);
    if (!grade) throw new NotFoundException('Grade curricular não encontrada');

    // PASSO 2 – Plano curricular do curso
    planoCurricularCursoCodigo = await this.buscarPlanoCurricularCurso(
      grade.CODIGO_CURSO,
      anoLectivoId,
    );

    // PASSO 3 – Plano da disciplina
    planoCurricularGrade = await this.buscarPlanoCurricularGrade(
      planoCurricularCursoCodigo?.CODIGO,
       grade.CODIGO,
    );
    console.log(planoCurricularCursoCodigo, planoCurricularGrade, grade, " Dados básicos carregados com sucesso");

    // PASSO 4 – Tipo de prova padrão
    const tipoProvaFinal = tipoProvaId || 1;

    // PASSO 5 – Validação obrigatória
    if (!tipoAvaliacaoId || !tipoProvaFinal) {
      return this.retornarVazio();
    }

    // PASSO 6 – Busca alunos (turma ou horário)
    let listaDeAlunosTemp: any[] = [];

    try {
      if (verHorario) {
        /*
        listaDeAlunosTemp = await this.buscarAlunosPorHorario(
          gradeId,
          horarioId!,
          tipoAvaliacaoId,
          tipoProvaFinal,
          anoLectivoId,
        );
        */
      } else {
        listaDeAlunosTemp = await this.buscarAlunosPorTurma(
          gradeId,
          turmaId!,
          tipoAvaliacaoId,
          tipoProvaFinal,
          anoLectivoId,
        );
      }

      // PASSO 7 – Lógica específica por tipo de avaliação (EXAME / RECURSO)
      switch (tipoAvaliacaoId) {
        case 6: // EXAME
          if (verHorario) {
            listaDeAlunosTemp = await this.findEstudantesParaLancamentoDeNotasByUCAndHorario2exame(
              gradeId,
              horarioId!,
              tipoProvaFinal,
              anoLectivoId,
            );
          }
          listaDeAlunosTemp.forEach((aluno) => {
            aluno.podeLancar = false;
            listaDeAlunos.push(this.mapearAluno(aluno));
          });
          break;

        case 7: // RECURSO
          if (verHorario) {
            listaDeAlunosTemp = await this.findEstudantesParaLancamentoDeNotasByUCAndHorarioRecurso(
              gradeId,
              horarioId!,
              tipoProvaFinal,
              anoLectivoId,
            );
          }
             console.log(listaDeAlunosTemp,"ESTUDANTE 3");
          listaDeAlunosTemp.forEach((aluno) => {
            aluno.podeLancar = true;
            listaDeAlunos.push(this.mapearAluno(aluno));
          });
          break;

        default:
          // Frequências normais + outros tipos
          if (verHorario) {
            listaDeAlunosTemp = await this.findEstudantesParaLancamentoDeNotasByUCAndHorario(gradeId,
              horarioId!,
              tipoAvaliacaoId,
              tipoProvaId!,
              anoLectivoId)

          }
          listaDeAlunosTemp.forEach((aluno) => {
            aluno.podeLancar = true;
            listaDeAlunos.push(this.mapearAluno(aluno));
          });
          break;
      }

   
      
      // PASSO 8 – Contar quem já tem nota
      estudantesComNotas = listaDeAlunos.filter((a: any) => a.nota >= 0).length;

      // PASSO 9 – Criar lançamento se ainda não existir
      if (estudantesComNotas === 0) {
        const lancamentoExiste = verHorario
          ? await this.verificarLancamentoEmAvaliacaoHorario(gradeId, horarioId!, tipoAvaliacaoId)
          : await this.verificarLancamentoEmAvaliacao(gradeId, turmaId!, tipoAvaliacaoId);

        if (lancamentoExiste) {
          await this.criarOuEditarLancamentoEpoca(lancamentoExiste);
        }
      }

      // PASSO 10 – Verificar permissão de lançamento
      const { podeLancar, podeLancarExcecao } = await this.verificarPermissao(dto, tipoAvaliacaoId);

      // PASSO 11 – Contar cadeirantes e novos
      let totalCadeirantes = 0;
      let totalNovos = 0;

      for (const aluno of listaDeAlunos as any) {
        if (await this.isCadeirante(aluno.codigoMatricula, anoLectivoId)) {
          totalCadeirantes++;
        } else {
          totalNovos++;
        }
      }

      return {
        listaDeAlunos,
        estudantesComNotas,
        totalAlunos: listaDeAlunos.length,
        totalCadeirantes,
        totalNovos,
        podeLancar,
        podeLancarExcecao,
      };
    } catch (error) {
      console.error('Erro crítico em buscarEstudantes:', error);
      throw error;
    }
  }

  // ======================== FUNÇÕES AUXILIARES COMPLETAS ========================

  private async buscarGradePorId(codigo: number): Promise<any> {
    const sql = `
      SELECT CODIGO, CODIGO_CURSO, CODIGO_CLASSE, CODIGO_SEMESTRE, CODIGO_DISCIPLINA
      FROM FK2_TB_GRADE_CURRICULAR 
      
      WHERE CODIGO = :codigo
    `;
    const result = await this.dataSource.query(sql, [codigo]);
    return result[0] || null;
  }
  private async buscarPlanoCurricularCurso(codigoCurso: number, codigoAnoLectivo: number): Promise<{ CODIGO: number } | null> {
    const result = await this.dataSource.query(
      `SELECT CODIGO
     FROM FK2_TB_PLANO_CURRICULAR_CURSO
     WHERE (:curso1 = 0 OR CODIGO_CURSO = :curso2)
       AND (:ano1 = 0 OR CODIGO_ANO_LECTIVO = :ano2)
     ORDER BY CODIGO DESC
     FETCH FIRST 1 ROW ONLY`,
      [codigoCurso, codigoCurso, codigoAnoLectivo, codigoAnoLectivo]
    );

    return result[0] ? { CODIGO: result[0].CODIGO } : null;
  }

  private async buscarPlanoCurricularGrade(planoCodigo: number, gradeCodigo: number): Promise<any | null> {
    const sql = `
      SELECT CODIGO, NOTA_MIN_PRATICA, PESO_PRATICA, NOTA_MIN_PRIMEIRA_FREQ, PESO_PRIMEIRA_FREQ,
             NOTA_MIN_SEGUNDA_FREQ, PESO_SEGUNDA_FREQ, CODIGO_PLANO_CURRICULAR_CURSO, CODIGO_GRADE_CURRICULAR
      FROM FK2_TB_PLANO_CURRICULAR_GRADE
      WHERE CODIGO_PLANO_CURRICULAR_CURSO = :planoCodigo
        AND CODIGO_GRADE_CURRICULAR = :gradeCodigo
    `;
    const result = await this.dataSource.query(sql, [planoCodigo, gradeCodigo]);
    return result[0] || null;
  }
  private async buscarAlunosPorTurma(
    gradeId: number,
    turmaId: number,
    tipoAvaliacaoId: number,
    tipoProvaId: number,
    anoLectivoId: number,
  ): Promise<any[]> {
    const sql = `
    SELECT DISTINCT
      gca.CODIGO AS codigo_grade,
      m.CODIGO AS numero_de_matricula,
      p.NOME_COMPLETO AS nome_completo,
      gcaa.CODIGO AS avaliacao,
      gcaa.STATUS_ AS status,
      gca.TURMA AS turma,
      gcaa.OBSERVACAO AS observacao,
      gcaa.NOTA AS nota,
      gcaa.CREATED_AT AS dataLancamento,
      gcaa.UPDATE_AT AS dataDeAtualizacao,
      tu.NOME AS nome_docente,
      TRIM(BOTH '"' FROM 
        JSON_VALUE(DBMS_LOB.SUBSTR(gcaa.REF_UTILIZADOR, 4000, 1), '$.desc')
      ) AS nome_docente_json
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES gcaa
      ON gcaa.GRADE_CURRICULAR_ALUNO = gca.CODIGO
      AND gcaa.TIPO_AVALIACAO = :tipoAval
      AND gcaa.TIPO_DE_PROVA = :tipoProva
    INNER JOIN FK2_TB_MATRICULAS m ON m.CODIGO = gca.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO a ON a.CODIGO = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p ON p.CODIGO = a.PRE_INCRICAO
    LEFT JOIN FK2_TB_UTILIZADORES tu ON tu.CODIGO = gcaa.UTILIZADOR
    WHERE m.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
      AND gca.CODIGO_GRADE_CURRICULAR = :gradeId
      AND gca.TURMA = :turmaId
      AND gca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
      AND gca.CODIGO_ANO_LECTIVO = :anoLectivoId
    ORDER BY p.NOME_COMPLETO
  `;

    const rows = await this.dataSource.query(sql, [
      tipoAvaliacaoId,
      tipoProvaId,
      gradeId,
      turmaId,
      anoLectivoId,
    ]);

    return rows.map(r => this.transformarRowParaAluno(r));
  }
 private async buscarAlunosPorHorario(
  gradeId: number,
  horarioId: number,
  tipoAvaliacaoId: number,
  tipoProvaId: number,
  anoLectivoId: number,
): Promise<any[]> {

  const sql = `
 SELECT DISTINCT
  gca.CODIGO                          AS codigo_grade,
  m.CODIGO                            AS numero_de_matricula,
  p.NOME_COMPLETO                     AS nome_completo,
  gcaa.CODIGO                         AS avaliacao,
  gcaa.STATUS_                        AS status,
  gcaa.OBSERVACAO                     AS observacao,
  gcaa.NOTA                           AS nota,
  gca.REF_HORARIO                     AS horario,
  gcaa.CREATED_AT                     AS dataLancamento,
  gcaa.UPDATE_AT                      AS dataDeAtualizacao,

  JSON_VALUE(
    DBMS_LOB.SUBSTR(gcaa.REF_UTILIZADOR, 4000, 1),
    '$.desc'
  ) AS nome_docente

FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca

LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES gcaa
  ON gcaa.GRADE_CURRICULAR_ALUNO = gca.CODIGO
 AND gcaa.TIPO_AVALIACAO = :tipoAvaliacaoId
 AND gcaa.TIPO_DE_PROVA  = :tipoProvaId

INNER JOIN FK2_TB_MATRICULAS m   ON m.CODIGO = gca.CODIGO_MATRICULA
INNER JOIN FK2_TB_ADMISSAO a     ON a.CODIGO = m.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO p ON p.CODIGO = a.PRE_INCRICAO

WHERE 
  TO_NUMBER(
    JSON_VALUE(
      DBMS_LOB.SUBSTR(gca.REF_HORARIO, 4000, 1),
      '$.pk'
    )
  ) = :horarioId

  AND gca.CODIGO_GRADE_CURRICULAR = :gradeId
  AND gca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
  AND gca.CODIGO_ANO_LECTIVO = :anoLectivoId

ORDER BY p.NOME_COMPLETO

  `;

  const rows = await this.dataSource.query(sql, {
    tipoAvaliacaoId,
    tipoProvaId,
    horarioId,
    gradeId,
    anoLectivoId,
  } as any);

  return rows.map(r => this.transformarRowParaAluno(r, true));
}

private async findEstudantesParaLancamentoDeNotasByUCAndHorario2exame(
  gradeId: number,
  horarioId: number,
  tipoProvaId: number,
  anoLectivoId: number,
): Promise<any[]> {
  console.log("11111111111");

  const sql = `
    SELECT *
    FROM (
      SELECT 
          GCA.CODIGO AS CODIGO_GRADE,
          MAT.CODIGO AS NUMERO_DE_MATRICULA,
          PRE.NOME_COMPLETO AS NOME_COMPLETO,
          AVA.CODIGO AS AVALIACAO,
          AVA.STATUS_ AS STATUS,
          AVA.OBSERVACAO AS OBSERVACAO,
          AVA.NOTA AS NOTA,
          DBMS_LOB.SUBSTR(GCA.REF_HORARIO,4000,1) AS HORARIO,
          AVA.CREATED_AT AS DATALANCAMENTO,
          AVA.UPDATE_AT AS DATADEATUALIZACAO,
          TO_CHAR(AVA.UPDATE_AT,'HH24') AS HORA,
          TO_CHAR(AVA.UPDATE_AT,'MI') AS MINUTO,
          TO_CHAR(AVA.CREATED_AT,'HH24') AS HORACRIACAO,
          TO_CHAR(AVA.CREATED_AT,'MI') AS MINUTOCRIACAO,
          (
            SELECT JSON_VALUE(
                       CAST(DBMS_LOB.SUBSTR(AVA2.REF_UTILIZADOR,4000,1) AS VARCHAR2(4000)),
                       '$.desc'
                   )
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA2
            WHERE AVA2.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
              AND AVA2.TIPO_AVALIACAO = :tipoAvaliacao
              AND AVA2.TIPO_DE_PROVA = :tipoProvaId
              AND ROWNUM = 1
          ) AS NOME_DOCENTE
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
          ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
         AND AVA.TIPO_AVALIACAO = :tipoAvaliacao
         AND AVA.TIPO_DE_PROVA  = :tipoProvaId
      INNER JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
      WHERE
          MAT.ESTADO_MATRICULA IN ('concluido','activo','inactivo')
          AND GCA.CODIGO_GRADE_CURRICULAR = :gradeId
          AND GCA.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
          AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
          AND NOT EXISTS (
              SELECT 1
              FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES X
              INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO Y
                  ON Y.CODIGO = X.GRADE_CURRICULAR_ALUNO
              WHERE Y.CODIGO_GRADE_CURRICULAR = :gradeId
                AND X.TIPO_AVALIACAO = 2
                AND X.NOTA >= 8
                AND X.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
          )
    ) t
    WHERE JSON_VALUE(t.HORARIO, '$.pk') = TO_CHAR(:horarioId)
    ORDER BY t.NOME_COMPLETO ASC
  `;

  const params = {
    tipoAvaliacao: 2,
    tipoProvaId,
    gradeId,
    horarioId,
    anoLectivoId,
  };

  const rows = await this.dataSource.query(sql, params as any);

  return rows.map((r: any) => ({
    ...this.transformarRowParaAluno(r, true),
    podeLancar: false,
  }));
}


private async findEstudantesParaLancamentoDeNotasByUCAndHorarioRecurso(
  gradeId: number,
  horarioId: number,
  tipoProvaId: number,
  anoLectivoId: number,
): Promise<any[]> {
  console.log("Executando findEstudantesParaLancamentoDeNotasByUCAndHorarioRecurso...");

const sql = `
SELECT *
FROM (
    SELECT 
        GCA.CODIGO AS CODIGO_GRADEC,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS AVALIACAO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)) AS HORARIO,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT),'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT),'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT),'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT),'MI') AS MINUTOCRIACAO,
        -- Subquery para trazer o docente
        (
            SELECT JSON_VALUE(
                       CAST(DBMS_LOB.SUBSTR(AVA2.REF_UTILIZADOR, 4000, 1) AS VARCHAR2(4000)), 
                       '$.desc'
                   )
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA2
            WHERE AVA2.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
              AND AVA2.TIPO_AVALIACAO = :tipoAvaliacaoExame
              AND AVA2.TIPO_DE_PROVA  = :tipoProvaId
              AND ROWNUM = 1
        ) AS NOME_DOCENTE
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_AVALIACAO = :tipoAvaliacaoExame
       AND AVA.TIPO_DE_PROVA  = :tipoProvaId
    INNER JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO
    WHERE
        MAT.ESTADO_MATRICULA IN ('concluido','activo','inactivo')
        AND GCA.CODIGO_GRADE_CURRICULAR = :gradeId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (4,5)
        AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND EXISTS (
            SELECT 1
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES EXA
            WHERE EXA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
              AND EXA.TIPO_AVALIACAO = 3
              AND (EXA.NOTA < 10 OR EXA.NOTA IS NULL)
        )
    GROUP BY 
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA
) t
WHERE JSON_VALUE(t.HORARIO, '$.pk') = TO_CHAR(:horarioId)
ORDER BY t.NOME_COMPLETO
`;


  const params = {
    tipoAvaliacaoExame: 4,
    tipoProvaId,
    gradeId,
    horarioId,
    anoLectivoId
  };

  const rows = await this.dataSource.query(sql, params as any);

  return rows.map((r: any) => ({
    ...this.transformarRowParaAluno(r, true),
    podeLancar: true,
    nomeDocente: r.NOME_DOCENTE,
  }));
}

private async findEstudantesParaLancamentoDeNotasByUCAndHorario(
  gradeId: number,
  horarioId: number,
  tipoAvaliacaoId: number,
  tipoProvaId: number,
  anoLectivoId: number,
): Promise<any[]> {

  console.log("Entrei",gradeId,horarioId,tipoAvaliacaoId,tipoProvaId,anoLectivoId);
  

  const sql = `
SELECT 
    GCA.CODIGO AS CODIGO_GRADE,
    MAT.CODIGO AS NUMERO_DE_MATRICULA,
    PRE.NOME_COMPLETO AS NOME_COMPLETO,
    AVA.CODIGO AS AVALIACAO,
    AVA.STATUS_ AS STATUS,
    AVA.OBSERVACAO AS OBSERVACAO,
    AVA.NOTA AS NOTA,
    MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)) AS HORARIO,
    MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
    MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
    TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
    TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
    TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
    TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO,
    
    -- Subquery para trazer o docente
    (
        SELECT JSON_VALUE(
                   CAST(DBMS_LOB.SUBSTR(AVA2.REF_UTILIZADOR, 4000, 1) AS VARCHAR2(4000)), 
                   '$.desc'
               )
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA2
        WHERE AVA2.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
        --  AND AVA2.TIPO_AVALIACAO = :tipoAvaliacaoId
          AND AVA2.TIPO_DE_PROVA  = :tipoProvaId
          AND ROWNUM = 1
    ) AS NOME_DOCENTE

FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
    ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
 --  AND AVA.TIPO_AVALIACAO = :tipoAvaliacaoId
  -- AND AVA.TIPO_DE_PROVA  = :tipoProvaId

INNER JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
INNER JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO

WHERE
    MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
  --  AND GCA.CODIGO_GRADE_CURRICULAR = :gradeId
    AND GCA.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
    AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId

GROUP BY 
    GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
    AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA

HAVING 
    JSON_VALUE(MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)), '$.pk') = TO_CHAR(:horarioId)

ORDER BY PRE.NOME_COMPLETO

`;

  const params = {   tipoAvaliacaoId,
    tipoProvaId,
  //  gradeId,
    horarioId,
    anoLectivoId};

  const rows = await this.dataSource.query(sql, params as any);

  console.log("RESULTADO",rows);
  

  return rows.map((r: any) => ({
    ...this.transformarRowParaAluno(r, true),
    podeLancar: false
  }));
}


  private async verificarLancamentoEmAvaliacao(
    gradeId: number,
    turmaId: number,
    tipoAvaliacaoId: number,
  ): Promise<any | null> {
    const sql = `
    SELECT CODIGO
    FROM FK2_TB_UNIDADE_CURRICULAR_LANCAMENTO_EPOCA
    WHERE UNIDADE_CURRICULAR = :gradeId
      AND TURMA = :turmaId
      AND EPOCA = :tipoAvaliacaoId
  `;

    const result = await this.dataSource.query(sql, [gradeId,
      turmaId,
      tipoAvaliacaoId,]);

    return result.length > 0 ? result[0] : null;
  }
  private async verificarLancamentoEmAvaliacaoHorario(
    gradeId: number,
    horarioId: number,
    tipoAvaliacaoId: number,
  ): Promise<any | null> {
    const sql = `
    SELECT CODIGO
    FROM FK2_TB_UNIDADE_CURRICULAR_LANCAMENTO_EPOCA
    WHERE UNIDADE_CURRICULAR = :gradeId
      AND JSON_VALUE(REF_HORARIO, '$.pk') = TO_CHAR(:horarioId)
      AND EPOCA = :tipoAvaliacaoId
  `;

    const result = await this.dataSource.query(sql, [gradeId,
      horarioId,
      tipoAvaliacaoId]);

    return result.length > 0 ? result[0] : null;
  }

private async criarOuEditarLancamentoEpoca(lancamento: {
  unidadeCurricular: number;   // código da UC (grade curricular)
  turma: number;               // código da turma
  epoca: number;               // código do tipo de avaliação (1=freq, 3=exame, 4=recurso...)
  refHorario?: string;         // JSON com { pk: 123, desc: "Turma A" }
  docente?: number;            // código do docente (opcional)
  refUtilizador?: string;      // JSON do utilizador que está a abrir
  motivoActualizacao?: string;
}): Promise<void> {
  const {
    unidadeCurricular,
    turma,
    epoca,
    refHorario,
    docente,
    refUtilizador,
    motivoActualizacao,
  } = lancamento;

  // Query UPSERT nativa do Oracle 12c+ (a mais rápida e segura)
  const sql = `
    MERGE INTO FK2_TB_UNIDADE_CURRICULAR_LANCAMENTO_EPOCA target
    USING (
      SELECT 
        :unidadeCurricular AS UNIDADE_CURRICULAR,
        :turma             AS TURMA,
        :epoca             AS EPOCA
      FROM DUAL
    ) source
    ON (
      target.UNIDADE_CURRICULAR = source.UNIDADE_CURRICULAR
      AND target.TURMA = source.TURMA
      AND target.EPOCA = source.EPOCA
    )
    WHEN MATCHED THEN
      UPDATE SET
        target.DATA_ACTUALIZACAO    = SYSDATE,
        target.MOTIVO_ACTUALIZACAO  = :motivoActualizacao,
        target.REF_UTILIZADOR       = :refUtilizador,
        target.REF_HORARIO          = :refHorario,
        target.DOCENTE              = :docente,
        target.NOTAS_LANCADAS       = 0  -- reinicia contagem se reabrir
    WHEN NOT MATCHED THEN
      INSERT (
        UNIDADE_CURRICULAR,
        TURMA,
        EPOCA,
        DATA_LANCAMENTO,
        DATA_ACTUALIZACAO,
        REF_HORARIO,
        REF_UTILIZADOR,
        DOCENTE,
        NOTAS_LANCADAS,
        MOTIVO_ACTUALIZACAO
      )
      VALUES (
        :unidadeCurricular,
        :turma,
        :epoca,
        SYSDATE,
        SYSDATE,
        :refHorario,
        :refUtilizador,
        :docente,
        0,
        :motivoActualizacao
      )
  `;

  await this.dataSource.query(sql, {
    unidadeCurricular,
    turma,
    epoca,
    refHorario: refHorario || null,
    docente: docente || null,
    refUtilizador: refUtilizador || null,
    motivoActualizacao: motivoActualizacao || 'Abertura/Reabertura de lançamento de notas',
  } as any) ;
}

  private async verificarPermissao(dto: BuscarEstudantesDto, tipoAvaliacaoId: number) {
    // Aqui vai tua lógica de prazo, grupos, exceções, etc.
    // Por enquanto retorna sempre true (conforme teu stub)
    // No Legado a logica que esta la nunca vai ser aplicado porque esta tudo true !
    return { podeLancar: true, podeLancarExcecao: true };
  }

  private async isCadeirante(matriculaCodigo: number, anoLectivoId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO gca ON gca.CODIGO_MATRICULA = m.CODIGO
      WHERE m.CODIGO = :matriculaCodigo
        AND gca.CODIGO_ANO_LECTIVO < :anoLectivoId
        AND gca.CODIGO_STATUS_GRADE_CURRICULAR = 4 -- 4 = cadeirante na tua base
    `;
    const [row] = await this.dataSource.query(sql, [matriculaCodigo, anoLectivoId]);
    return row.TOTAL > 0;
  }

  private transformarRowParaAluno(row: any, isHorario = false): any {
    const temNota = row.AVALIACAO != null;
    const dataLanc = row.DATALANCAMENTO
      ? new Date(row.DATALANCAMENTO).toISOString().split('T')[0]
      : '';
    const dataAtu = row.DATAADEATUALIZACAO
      ? new Date(row.DATAADEATUALIZACAO).toISOString().split('T')[0]
      : '';

    return {
      codigoGrade: row.CODIGO_GRADE,
      codigoMatricula: row.NUMERO_DE_MATRICULA,
      nomeCompleto: row.NOME_COMPLETO,
      codigoAvalizacao: temNota ? row.AVALIACAO : 0,
      nota: temNota ? row.NOTA : -1,
      observacao: row.OBSERVACAO || '',
      status: row.STATUS || 0,
      turma: isHorario ? null : row.TURMA,
      horario: isHorario ? row.HORARIO : null,
      podeLancar: false,
      docente: row.NOME_DOCENTE || row.NOME_DOCENTE_JSON || '',
      dataDeLancamento: dataLanc,
      dataDeAtualizacao: dataAtu,
    };
  }

  private mapearAluno(aluno: any): EstudanteLancamentoDto {
    return {
      codigoMatricula: aluno.codigoMatricula,
      nomeCompleto: aluno.nomeCompleto,
      nota: aluno.nota,
      observacao: aluno.observacao,
      podeLancar: aluno.podeLancar,
      docente: aluno.docente,
      dataLancamento: aluno.dataDeLancamento,
      dataAtualizacao: aluno.dataDeAtualizacao,
      // adiciona os outros campos que teu DTO tem
    } as unknown as EstudanteLancamentoDto;
  }

  private retornarVazio() {
    return {
      listaDeAlunos: [],
      estudantesComNotas: 0,
      totalAlunos: 0,
      totalCadeirantes: 0,
      totalNovos: 0,
      podeLancar: false,
      podeLancarExcecao: false,
    };
  }
}
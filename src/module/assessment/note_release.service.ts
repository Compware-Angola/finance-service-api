import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { StudentFiltersDto } from "./dto/studenty-filter.dto";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";
import { StudentEvaluationDto } from "./dto/student-evaluation.dto";

@Injectable()
export class NoteReleaseService {
  constructor(private readonly dataSource: DataSource) { }


  async findstudents(filters: StudentFiltersDto) {
    const { anoLectivoId, horarioId, tipoProvaId, classe, tipoAvaliacao, turno } = filters;

    let studentsFilter: any

    switch (tipoAvaliacao) {
      case 6:
        studentsFilter = await this.getGeneralStudentNoteRelease2Exame(anoLectivoId, horarioId, tipoProvaId, classe, tipoAvaliacao, turno)

        break;

      case 7:
        studentsFilter = await this.getGeneralStudentNoteReleaseRecurso(anoLectivoId, horarioId, tipoProvaId, classe, tipoAvaliacao, turno)
        break

      default:
        studentsFilter = await this.getGeneralStudentNoteRelease(anoLectivoId, horarioId, tipoProvaId, classe, tipoAvaliacao, turno)

        break;
    }



    return { success: true, data: await toLowerCaseKeys(studentsFilter) };
  }


  async upsertStudentEvaluation(dto: StudentEvaluationDto) {
    const {
      gradeCurricularAluno,
      tipoDeProva,
      tipoAvaliacao,
      utilizador,
      nota,
      epoca,
      observacao,
      status,
      notaAnterior,
      refUtilizador,
      codigo_grade_avaliacao_aluno
    } = dto;

    console.log(codigo_grade_avaliacao_aluno, tipoAvaliacao, tipoDeProva);

    const existing = await this.dataSource.query(
      `
  SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES
  WHERE CODIGO = :codigo_grade_avaliacao_aluno
    AND TIPO_DE_PROVA = :tipoDeProva
    AND TIPO_AVALIACAO = :tipoAvaliacao
  `,
      { codigo_grade_avaliacao_aluno, tipoDeProva, tipoAvaliacao } as any
    );



    if (existing.length != 0) {
      // Executa UPDATE
      const updateResult = await this.dataSource.query(
        `
    UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES
    SET 
      UTILIZADOR = :utilizador,
      NOTA = :nota,
      EPOCA = :epoca,
      OBSERVACAO = :observacao,
      STATUS_ = :status,
      NOTA_ANTERIOR = :notaAnterior,
      REF_UTILIZADOR = :refUtilizador,
      UPDATE_AT = SYSDATE
    WHERE CODIGO = :codigo_grade_avaliacao_aluno
      AND TIPO_DE_PROVA = :tipoDeProva
      AND TIPO_AVALIACAO = :tipoAvaliacao
    `,
        {
          codigo_grade_avaliacao_aluno,
          tipoDeProva,
          tipoAvaliacao,
          utilizador,
          nota,
          epoca,
          observacao,
          status,
          notaAnterior,
          refUtilizador: JSON.stringify(refUtilizador),
        } as any,
      );

    } else {
      // Executa INSERT
      // se for a segunda frenquincia procurar a primeira para meter na nota anterior
      const result = await this.dataSource.query(
        `SELECT MAX(CODIGO) AS MAX_CODIGO FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES`
      );
      const nextCodigo = (result[0]?.MAX_CODIGO || 0) + 1;

      await this.dataSource.query(
        `
      INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES (
        CODIGO,
        GRADE_CURRICULAR_ALUNO,
        UTILIZADOR,
        NOTA,
        TIPO_DE_PROVA,
        EPOCA,
        CREATED_AT,
        UPDATE_AT,
        TIPO_AVALIACAO,
        OBSERVACAO,
        STATUS_,
        NOTA_ANTERIOR,
        REF_UTILIZADOR
      ) VALUES (
        :codigo,
        :gradeCurricularAluno,
        :utilizador,
        :nota,
        :tipoDeProva,
        :epoca,
        SYSDATE,
        SYSDATE,
        :tipoAvaliacao,
        :observacao,
        :status,
        :notaAnterior,
        :refUtilizador
      )
      `,
        {
          codigo: nextCodigo,
          gradeCurricularAluno,
          tipoDeProva,
          tipoAvaliacao,
          utilizador,
          nota,
          epoca,
          observacao,
          status,
          notaAnterior,
          refUtilizador: JSON.stringify(refUtilizador),
        } as any,
      );
    }




    return { message: 'Avaliação inserida ou atualizada com sucesso' };
  }
  private async getGeneralStudentNoteRelease(anoLectivoId: number, horarioId: number, tipoProvaId: number, classe: number, tipoAvaliacao: number, turno: number) {

    const query = `
    SELECT 
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)) AS HORARIO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_UTILIZADOR , 4000, 1)) AS DOCENTE,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO= :tipoAvaliacao
    INNER JOIN FK2_TB_MATRICULAS MAT 
        ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM 
        ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE 
        ON PRE.CODIGO = ADM.PRE_INCRICAO
    INNER JOIN FK2_TB_CONFIRMACOES CONF 
        ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
        MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
        AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk')= :horarioId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
        AND CONF.CLASSE = :classe
        AND PRE.CODIGO_TURNO  =:turno
    GROUP BY 
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA, CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno
    } as any);


  }
  private async getGeneralStudentNoteReleaseRecurso(anoLectivoId: number, horarioId: number, tipoProvaId: number, classe: number, tipoAvaliacao: number, turno: number) {

    const query = `
    SELECT 
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)) AS HORARIO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_UTILIZADOR , 4000, 1)) AS DOCENTE,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO= :tipoAvaliacao
    INNER JOIN FK2_TB_MATRICULAS MAT 
        ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM 
        ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE 
        ON PRE.CODIGO = ADM.PRE_INCRICAO
    INNER JOIN FK2_TB_CONFIRMACOES CONF 
        ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
        MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
        AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk')= :horarioId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5,4)
        AND CONF.CLASSE = :classe
        AND PRE.CODIGO_TURNO  =:turno
    GROUP BY 
        GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
        AVA.CODIGO, AVA.STATUS_, AVA.OBSERVACAO, AVA.NOTA, CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno
    } as any);


  }
  private async getGeneralStudentNoteRelease2Exame(anoLectivoId: number, horarioId: number, tipoProvaId: number, classe: number, tipoAvaliacao: number, turno: number) {

    const query = `
    SELECT 
        GCA.CODIGO AS CODIGO_GRADE_ALUNO,
        MAT.CODIGO AS NUMERO_DE_MATRICULA,
        PRE.NOME_COMPLETO AS NOME_COMPLETO,
        AVA.CODIGO AS CODIGO_GRADE_AVALIACAO_ALUNO,
        AVA.STATUS_ AS STATUS,
        AVA.OBSERVACAO AS OBSERVACAO,
        AVA.NOTA AS NOTA,
        CONF.CODIGO AS CODIGO_CONFIRMACAO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_HORARIO, 4000, 1)) AS HORARIO,
        MIN(DBMS_LOB.SUBSTR(GCA.REF_UTILIZADOR , 4000, 1)) AS DOCENTE,
        MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
        MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'HH24') AS HORA,
        TO_CHAR(MIN(AVA.UPDATE_AT), 'MI') AS MINUTO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'HH24') AS HORACRIACAO,
        TO_CHAR(MIN(AVA.CREATED_AT), 'MI') AS MINUTOCRIACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
        ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
       AND AVA.TIPO_DE_PROVA = :tipoProvaId
       AND AVA.TIPO_AVALIACAO= :tipoAvaliacao
    INNER JOIN FK2_TB_MATRICULAS MAT 
        ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ADM 
        ON ADM.CODIGO = MAT.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE 
        ON PRE.CODIGO = ADM.PRE_INCRICAO
    INNER JOIN FK2_TB_CONFIRMACOES CONF 
        ON CONF.CODIGO = GCA.CODIGO_CONFIRMACAO
    WHERE
        MAT.ESTADO_MATRICULA IN ('concluido', 'diplomado', 'activo', 'inactivo')
        AND GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
        AND JSON_VALUE(GCA.REF_HORARIO, '$.pk')= :horarioId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
        AND CONF.CLASSE = :classe
        AND PRE.CODIGO_TURNO  =:turno
            AND GCA.CODIGO NOT IN (
        SELECT TGCAA.GRADE_CURRICULAR_ALUNO
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES TGCAA
        INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO GCA2 
            ON GCA2.CODIGO = TGCAA.GRADE_CURRICULAR_ALUNO
        WHERE  JSON_VALUE(GCA.REF_HORARIO, '$.pk') = :horarioId
          AND TGCAA.NOTA >= 8
          AND TGCAA.TIPO_AVALIACAO = 2
    )
GROUP BY 
    GCA.CODIGO,
    MAT.CODIGO,
    PRE.NOME_COMPLETO,
    AVA.CODIGO,
    AVA.STATUS_,
    AVA.OBSERVACAO,
    AVA.NOTA,
    CONF.CODIGO
    ORDER BY PRE.NOME_COMPLETO
  `;

    return await this.dataSource.query(query, {
      anoLectivoId,
      horarioId,
      tipoProvaId,
      tipoAvaliacao,
      classe,
      turno
    } as any);


  }


}
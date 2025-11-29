import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EstudanteLancamentoDto } from "./dto/estudante-lancamento.dto";
import { BuscarEstudantesDto } from "./dto/buscar-estudantes.dto";

@Injectable()
export class NoteReleaseService {
  constructor(private dataSource: DataSource) { }
async buscarEstudantes(dto: BuscarEstudantesDto): Promise<EstudanteLancamentoDto[]> {
    const {
      gradeId,
      tipoAvaliacaoId,
      tipoProvaId = 1,
      anoLectivoId,
      turmaId,
      horarioId,
      verHorario,
    } = dto;

    // 1. Busca plano curricular
    const planoSql = `
      SELECT pc.CODIGO AS planoCodigo
      FROM FK2_TB_PLANO_CURRICULAR_CURSO pc
      JOIN FK2_TB_GRADE_CURRICULAR gc ON gc.CODIGO_CURSO = pc.CODIGO_CURSO
      WHERE gc.CODIGO = ${gradeId}
        AND pc.CODIGO_ANO_LECTIVO = ${anoLectivoId}
      ORDER BY pc.CODIGO DESC
      FETCH FIRST 1 ROW ONLY
    `;

    const planoResult = await this.dataSource.query(planoSql);
    if (!planoResult.length) throw new NotFoundException('Plano não encontrado');

    const planoCodigo = planoResult[0].PLANOCODIGO;

    // 2. Busca plano grade
    const planoGradeSql = `
      SELECT CODIGO FROM FK2_TB_PLANO_CURRICULAR_GRADE
      WHERE CODIGO_PLANOCURRICULARCURSO = ${planoCodigo}
        AND CODIGO_GRADECURRICULAR = ${gradeId}
    `;
    const planoGradeResult = await this.dataSource.query(planoGradeSql);
    if (!planoGradeResult.length) throw new NotFoundException('Grade não encontrada no plano');

    let alunos: any[] = [];

    // 3. Lógica por tipo de avaliação (exatamente como no Java)
    if (tipoAvaliacaoId === 6) {
      // Exame (só quem reprovou na 2ª frequência)
      const sql = verHorario
        ? this.sqlExamePorHorario(gradeId, horarioId!, tipoProvaId, anoLectivoId)
        : this.sqlExamePorTurma(gradeId, turmaId!, tipoProvaId, anoLectivoId);

      alunos = await this.dataSource.query(sql);
      alunos.forEach(a => (a. = false)); // Exame: só pode lançar se reprovou
    } else if (tipoAvaliacaoId === 7) {
      // Recurso
      const sql = verHorario
        ? this.sqlRecursoPorHorario(gradeId, horarioId!, tipoProvaId, anoLectivoId)
        : this.sqlRecursoPorTurma(gradeId, turmaId!, tipoProvaId, anoLectivoId);

      alunos = await this.dataSource.query(sql);
      alunos.forEach(a => (a.PODE_LANCAR = true));
    } else {
      // Frequências normais
      const sql = verHorario
        ? this.sqlNormalPorHorario(gradeId, horarioId!, tipoAvaliacaoId, tipoProvaId, anoLectivoId)
        : this.sqlNormalPorTurma(gradeId, turmaId!, tipoAvaliacaoId, tipoProvaId, anoLectivoId);

      alunos = await this.dataSource.query(sql);
      alunos.forEach(a => (a.PODE_LANCAR = true));
    }

    // 4. Verifica cadeirante (exemplo simples — adapte conforme sua regra)
    const alunosFormatados = alunos.map(aluno => ({
      numeroEstudante: aluno.NUMERO_ESTUDANTE,
      nome: aluno.NOME,
      nota: aluno.NOTA ? Number(aluno.NOTA) : null,
      podeLancar: aluno.PODE_LANCAR === 1,
      cadeirante: this.isCadeirante(aluno.NUMERO_ESTUDANTE, anoLectivoId), // sua lógica aqui
    }));

    return alunosFormatados;
  }

  // SQLs separadas (exemplo para exame por turma)
  private sqlExamePorTurma(gradeId: number, turmaId: number, tipoProvaId: number, anoLectivoId: number) {
    return `
      SELECT 
        e.NUMERO_ESTUDANTE,
        p.NOME_COMPLETO AS NOME,
        NVL(n.NOTA, -1) AS NOTA,
        0 AS PODE_LANCAR
      FROM TB_ESTUDANTE e
      JOIN TB_INSCRICAO i ON i.CODIGO_ESTUDANTE = e.CODIGO
      JOIN TB_PESSOA p ON p.CODIGO = e.CODIGO_PESSOA
      LEFT JOIN TB_NOTAS n ON n.CODIGO_INSCRICAO = i.CODIGO
        AND n.TIPO_AVALIACAO = 3  -- 2ª frequência
      WHERE i.CODIGO_TURMA = ${turmaId}
        AND i.CODIGO_GRADE_CURRICULAR = ${gradeId}
        AND i.ANO_LECTIVO = ${anoLectivoId}
        AND (n.NOTA < 9.5 OR n.NOTA IS NULL)
      ORDER BY p.NOME_COMPLETO
    `;
  }

  private isCadeirante(numeroEstudante: number, anoLectivoId: number): boolean {
    // Sua lógica de cadeirante aqui
    return false; // placeholder
  }
}
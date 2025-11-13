// src/services/propina-aluno.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

interface PropinaResult {
  Descricao: string;
  Preco: number;
  TipoServico: string;
  Codigo: number;
  taxa?: number;
}

@Injectable()
export class PropinaAlunoService {
  private cache = new Map<string, PropinaResult | null>();

  constructor(
  
     private dataSource: DataSource,
  ) {}

  async propinaAluno(
    codigo_inscricao: number,
    aluno_cacuaco: number,
    ano_lectivo: number,
    matricula:number,
    user:any
  ): Promise<PropinaResult | null> {
    const cacheKey = `${codigo_inscricao}-${aluno_cacuaco}-${ano_lectivo}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 2. Define ano letivo com base no tipo de candidatura
    const anoLectivoId = await this.getAnoLectivoByCandidatura(user, ano_lectivo);

    // 3. Busca curso da pré-inscrição
    const curso = await this.getCursoByPreinscricao(codigo_inscricao.toString());
    console.log(curso,"WWWWWWWWWWWWWWWWW");
    
    if (!curso) return null;

    // 4. Verifica exceção de pagamento
    const temExcecao = await this.checkExcecao(matricula);
    let propina: PropinaResult | null = null;

    if (temExcecao && temExcecao.data_fim >= new Date().toISOString().split('T')[0]) {
      const cursoExcecao = await this.getCursoById(temExcecao.codigo_curso_pagamento);
      if (cursoExcecao) {
        propina = await this.getPropinaByCurso(
          cursoExcecao.curso,
          aluno_cacuaco,
          anoLectivoId,
        );
      }
    } else {
      propina = await this.getPropinaByCurso(curso.curso, aluno_cacuaco, anoLectivoId);
    }

    this.cache.set(cacheKey, propina);
    return propina;
  }

  private async getAnoLectivoByCandidatura(user: any, ano_lectivo: number): Promise<number> {
    if (user.codigo_tipo_candidatura === 1) return ano_lectivo;
    if (user.codigo_tipo_candidatura === 2) {
      const mestrado = await this.cicloMestrado();
      return mestrado?.Codigo ?? ano_lectivo;
    }
    const doutoramento = await this.cicloDoutoramento();
    return doutoramento?.Codigo ?? ano_lectivo;
  }

private async getCursoByPreinscricao(preinscricaoId: string): Promise<{ curso: string; codigo_curso: number } | null> {
  const query = `
    SELECT c."Designacao" AS curso, c."Codigo" AS codigo_curso
    FROM "DBUMA"."UMA_TB_CURSOS" c
    INNER JOIN "DBUMA"."UMA_TB_PREINSCRICAO" p
      ON c."Codigo" = p."Curso_Candidatura"
    WHERE p."Codigo" = :1
    FETCH NEXT 1 ROWS ONLY
  `;

  const result = await this.dataSource.query(query, [preinscricaoId]);
const mapped = result.map(r => ({
  curso: r.CURSO || r.curso,
  codigo_curso: r.CODIGO_CURSO || r.codigo_curso,
}));
  return mapped[0] || null;
}


  private async getCursoById(codigo_curso: number) {
    const result = await this.dataSource.query(`
      SELECT Designacao AS curso FROM "DBUMA"."UMA_TB_CURSOS" WHERE Codigo = ?   FETCH NEXT 1 ROWS ONLY
    `, [codigo_curso]);
    return result[0] || null;
  }

private async getPropinaByCurso(
  nomeCurso: string,
  cacuaco: number,
  ano_lectivo: number,
): Promise<PropinaResult | null> {
  const result = await this.dataSource.query(`
    SELECT 
      ts."Descricao",
      ts."Preco",
      ts."TipoServico",
      ts."Codigo",
      tt."taxa"
    FROM "DBUMA"."UMA_TB_TIPO_SERVICOS" ts
    LEFT JOIN "DBUMA"."UMA_TIPO_TAXAS" tt ON tt."id" = ts."taxa_iva_id"
    WHERE ts."Descricao" LIKE :1
      AND ts."cacuaco" = :2
      AND ts."codigo_ano_lectivo" = :3
    FETCH NEXT 1 ROWS ONLY
  `,[`propina ${nomeCurso}%`, cacuaco, ano_lectivo]);

  return result[0] || null;
}



private async checkExcecao(matricula: number) {
  const result = await this.dataSource.query(`
    SELECT "codigo_curso_pagamento", "data_fim"
    FROM "DBUMA"."UMA_CURSO_PAGAMENTO_EXCEPCAO"
    WHERE "codigo_matricula" = :1
    FETCH NEXT 1 ROWS ONLY
  `, [matricula]);

  return result[0] || null;
}


   /**
   * Retorna o ciclo de Mestrado
   */

async cicloDoutoramento() {
const result = await this.dataSource.query(`
  SELECT "Codigo", "Designacao"
  FROM "DBUMA"."UMA_TB_ANO_LECTIVO"
  WHERE "Designacao" = 'Ciclo Doutoramento'
  FETCH NEXT 1 ROWS ONLY
`);

  return result[0] || null;
}

async cicloMestrado() {
  const result = await this.dataSource.query(`
    SELECT "Codigo", "Designacao"
    FROM "DBUMA"."UMA_TB_ANO_LECTIVO"
    WHERE "Designacao" = 'Ciclo Mestrado'
    FETCH NEXT 1 ROWS ONLY
  `);
  return result[0] || null;
}

}
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateIsencaoDto } from './dto/create-isencao.dto';
import { UpdateIsencaoDto } from './dto/update-isencao.dto';
import { FilterIsencaoDto } from './dto/filter-isencao.dto';
import { PagedResult } from '../../common/dto/pagination-result.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class IsencaoService {
  constructor(private readonly dataSource: DataSource) {}

  async create(createDto: CreateIsencaoDto) {
    const sql = `
      INSERT INTO "FK2_TB_ISENCOES" (
        "CODIGO_MATRICULA",
        "CODIGO_SERVICO",
        "CODIGO_UTILIZADOR",
        "DATA_ISENCAO",
        "CANAL",
        "OBS",
        "ESTADO_ISENSAO",
        "CODIGO_ANOLECTIVO",
        "CODIGO_PREINSCRICAO",
        "CREATED_AT"
      ) VALUES (
        :codigoMatricula,
        :codigoServico,
        :codigoUtilizador,
        TO_DATE(:dataIsencao, 'YYYY-MM-DD'),
        :canal,
        :obs,
        'ACTIVO',
        :codigoAnoLectivo,
        :codigoPreInscricao,
        CURRENT_DATE
      )
    `;

    const params = {
      codigoMatricula: createDto.codigoMatricula,
      codigoServico: createDto.codigoServico,
      codigoUtilizador: createDto.codigoUtilizador || null,
      dataIsencao: createDto.dataIsencao,
      canal: createDto.canal || null,
      obs: createDto.obs || null,
      codigoAnoLectivo: createDto.codigoAnoLectivo,
      codigoPreInscricao: createDto.codigoPreInscricao || null,
    };

    await this.dataSource.query(sql, Object.values(params));
  }

  async update(id: number, updateDto: UpdateIsencaoDto) {
    const setClauses: string[] = [];
    const params: any = {};

    if (updateDto.codigoMatricula !== undefined) {
      setClauses.push('"CODIGO_MATRICULA" = :codigoMatricula');
      params.codigoMatricula = updateDto.codigoMatricula;
    }
    if (updateDto.codigoServico !== undefined) {
      setClauses.push('"CODIGO_SERVICO" = :codigoServico');
      params.codigoServico = updateDto.codigoServico;
    }
    if (updateDto.codigoUtilizador !== undefined) {
      setClauses.push('"CODIGO_UTILIZADOR" = :codigoUtilizador');
      params.codigoUtilizador = updateDto.codigoUtilizador;
    }
    if (updateDto.dataIsencao !== undefined) {
      setClauses.push('"DATA_ISENCAO" = TO_DATE(:dataIsencao, \'YYYY-MM-DD\')');
      params.dataIsencao = updateDto.dataIsencao;
    }
    if (updateDto.canal !== undefined) {
      setClauses.push('"CANAL" = :canal');
      params.canal = updateDto.canal;
    }
    if (updateDto.obs !== undefined) {
      setClauses.push('"OBS" = :obs');
      params.obs = updateDto.obs;
    }
    if (updateDto.estadoIsencao !== undefined) {
      setClauses.push('"ESTADO_ISENSAO" = :estadoIsencao');
      params.estadoIsencao = updateDto.estadoIsencao;
    }
    if (updateDto.codigoAnoLectivo !== undefined) {
      setClauses.push('"CODIGO_ANOLECTIVO" = :codigoAnoLectivo');
      params.codigoAnoLectivo = updateDto.codigoAnoLectivo;
    }
    if (updateDto.codigoPreInscricao !== undefined) {
      setClauses.push('"CODIGO_PREINSCRICAO" = :codigoPreInscricao');
      params.codigoPreInscricao = updateDto.codigoPreInscricao;
    }

    if (setClauses.length === 0) {
      return { message: 'Nenhum campo para atualizar' };
    }

    setClauses.push('"UPDATED_AT" = CURRENT_DATE');

    const sql = `
      UPDATE "FK2_TB_ISENCOES"
      SET ${setClauses.join(', ')}
      WHERE "CODIGO" = :id
    `;
    params.id = id;

    await this.dataSource.query(sql, Object.values(params));
  }

  async findAll(filters: FilterIsencaoDto): Promise<PagedResult<any>> {
    const {
      page = 1,
      limit = 10,
      codigoMatricula,
      codigoServico,
      estadoIsencao,
      anoLectivo,
      codigoCurso,
      faculdadeId,
    } = filters;
    const skip = (page - 1) * limit;

    const whereConditions: string[] = [];
    const params: any = {};

    if (codigoMatricula) {
      whereConditions.push('a.CODIGO_MATRICULA = :codigoMatricula');
      params.codigoMatricula = codigoMatricula;
    }

    if (codigoServico) {
      whereConditions.push('a.CODIGO_SERVICO = :codigoServico');
      params.codigoServico = codigoServico;
    }

    if (estadoIsencao) {
      whereConditions.push('a.ESTADO_ISENSAO = :estadoIsencao');
      params.estadoIsencao = estadoIsencao;
    }
    if (codigoCurso) {
      whereConditions.push('k.CODIGO = :codigoCurso');
      params.codigoCurso = codigoCurso;
    }
    if (anoLectivo) {
      whereConditions.push('c.CODIGO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }
    if (faculdadeId) {
      whereConditions.push('k.FACULDADE_ID = :faculdadeId');
      params.faculdadeId = faculdadeId;
    }
    const additionalWhere =
      whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

    const baseFromAndWhere = `
      from "FK2_TB_ISENCOES" a
      , FK2_TB_ANO_LECTIVO c
      , FK2_TB_MATRICULAS h
      , FK2_TB_ADMISSAO i
      , FK2_TB_PREINSCRICAO j
      , FK2_TB_CURSOS k
      , FK2_TB_GRAU_ACADEMICO l
      , FK2_TB_TIPO_SERVICOS m
      where 1=1
      and a.CODIGO_ANOLECTIVO = c.CODIGO (+)
      and a.CODIGO_MATRICULA = h.CODIGO (+)
      AND h.CODIGO_ALUNO = i.CODIGO (+)
      AND i.PRE_INCRICAO = j.CODIGO (+)
      AND h.CODIGO_CURSO = k.CODIGO (+)
      AND j.codigo_grau_academico = l.codigo (+)
      AND a.CODIGO_SERVICO = m.CODIGO (+)
      ${additionalWhere}
    `;

    const countSql = `
      SELECT COUNT(*) as TOTAL
      ${baseFromAndWhere}
    `;

    const countResult = await this.dataSource.query(
      countSql,
      Object.values(params),
    );
    const total = Number(countResult[0]?.TOTAL || 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    const sql = `
      SELECT * FROM (
        SELECT b.*, ROWNUM rnum FROM (
          SELECT a.CODIGO_MATRICULA,
                 a.CODIGO_PREINSCRICAO,
                 j.NOME_COMPLETO,
                 j.BILHETE_IDENTIDADE,
                 k.DESIGNACAO CURSO,
                 l.DESIGNACAO GRAU_ACADEMICO,
                 a.CODIGO_SERVICO,
                 m.DESCRICAO SERVICO,
                 a.DATA_ISENCAO,
                 a.ESTADO_ISENSAO,
                 a.CODIGO_ANOLECTIVO,
                 c.DESIGNACAO ANO_LECTIVO,
                 a.CODIGO
          ${baseFromAndWhere}
          ORDER BY a.CODIGO DESC
        ) b WHERE ROWNUM <= :upperLimit
      ) WHERE rnum > :lowerLimit
    `;

    params.upperLimit = skip + limit;
    params.lowerLimit = skip;

    const rawData = await this.dataSource.query(sql, Object.values(params));
    const data = await toLowerCaseKeys(rawData);
    const cleanedData = data.map(({ rnum, ...rest }) => rest);

    return {
      data: cleanedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number) {
    const sql = `SELECT * FROM "FK2_TB_ISENCOES" WHERE "CODIGO" = :id`;
    const result = await this.dataSource.query(sql, [id]);
    if (result.length === 0)
      throw new NotFoundException(`Isenção com código ${id} não encontrada`);
    const data = await toLowerCaseKeys(result);
    return data[0];
  }
}

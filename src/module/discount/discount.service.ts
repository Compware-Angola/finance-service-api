import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterDiscountDto } from './dto/filter-discount.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { PagedResult } from '../../common/dto/pagination-result.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FilterAddDiscountDto } from './dto/filter-add-discount.dto';
import { CreateAddDiscountDto } from './dto/create-add-discount.dto';
import { UpdateAddDiscountDto } from './dto/update-add-discount.dto';

@Injectable()
export class DiscountService {
  constructor(private readonly dataSource: DataSource) {}

  async create(createDto: CreateDiscountDto) {
    const sql = `
      INSERT INTO FK2_DESCONTOS_ESPECIAIS (
        DESCRICAO,
        TAXA,
        DATA_INICIO,
        DATA_FIM,
        OBS,
        ESTADO
      ) VALUES (
        :descricao,
        :taxa,
        TO_DATE(:data_inicio, 'YYYY-MM-DD'),
        TO_DATE(:data_fim, 'YYYY-MM-DD'),
        :obs,
        :estado
      )
    `;

    const params = [
      createDto.descricao,
      createDto.taxa,
      new Date(createDto.data_inicio).toISOString().split('T')[0],
      new Date(createDto.data_fim).toISOString().split('T')[0],
      createDto.obs || null,
      createDto.estado === false ? 0 : 1,
    ];

    await this.dataSource.query(sql, params);
  }

  async addDiscount(createDto: CreateAddDiscountDto) {
    const checkSql = `
      SELECT 1
      FROM FK2_TB_BOLSEIROS
      WHERE CODIGO_MATRICULA = :codigoMatricula
        FETCH FIRST 1 ROWS ONLY
    `;

    const checkParams = [createDto.codigoMatricula];

    const result = await this.dataSource.query(checkSql, checkParams);

    if (result.length > 0) {
      throw new BadRequestException('Matrícula já possui bolsa.');
    }

    const sql = `
      INSERT INTO FK2_TB_DESCONTOS_ALUNOO (
        CODIGO_MATRICULA,
        TIPO_TAXA_DESCONTO_ESPECIAL,
        CODIGO_ANOLECTIVO,
        OBSERVACAO,
        INSTITUICAO_ID,
        ESTATUS_DESCONTO_ID,
        SEMESTRE,
        CREATED_AT
        --ISENTAR_MULTA,
        --CODIGO_TIPO_DESCONTO,
        --AFECTACAO
      ) VALUES (
        :codigoMatricula,
        :codigoTaxa,
        :codigoAnoLectivo,
        :observacao,
        :codigoInstituicao,
        1,
        :semestre,
        sysdate
      )
    `;

    const params = [
      createDto.codigoMatricula,
      createDto.codigoTaxa,
      createDto.codigoAno,
      createDto.observacao,
      createDto.codigoInstituicao,
      createDto.semestre,
    ];

    await this.dataSource.query(sql, params);
  }

  async update(id: number, updateDto: UpdateDiscountDto) {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updateDto.descricao !== undefined) {
      setClauses.push('DESCRICAO = :descricao');
      params.push(updateDto.descricao);
    }
    if (updateDto.taxa !== undefined) {
      setClauses.push('TAXA = :taxa');
      params.push(updateDto.taxa);
    }
    if (updateDto.data_inicio !== undefined) {
      setClauses.push("DATA_INICIO = TO_DATE(:data_inicio, 'YYYY-MM-DD')");
      params.push(updateDto.data_inicio);
    }
    if (updateDto.data_fim !== undefined) {
      setClauses.push("DATA_FIM = TO_DATE(:data_fim, 'YYYY-MM-DD')");
      params.push(updateDto.data_fim);
    }
    if (updateDto.obs !== undefined) {
      setClauses.push('OBS = :obs');
      params.push(updateDto.obs);
    }
    if (updateDto.estado !== undefined) {
      setClauses.push('ESTADO = :estado');
      params.push(updateDto.estado ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return { message: 'Nenhum campo para atualizar' };
    }

    const sql = `
      UPDATE FK2_DESCONTOS_ESPECIAIS
      SET ${setClauses.join(', ')}
      WHERE ID = :id
    `;
    params.push(id);

    await this.dataSource.query(sql, params);
  }

  async findAll(filters: FilterDiscountDto): Promise<PagedResult<any>> {
    const { page = 1, limit = 10, codigo, designacao, percentual } = filters;
    const skip = (page - 1) * limit;

    const whereConditions: string[] = [];
    const params: any = {};
    if (codigo) {
      whereConditions.push('a.ID = :codigo');
      params.codigo = codigo;
    }

    if (designacao) {
      whereConditions.push('UPPER(a.DESCRICAO) LIKE UPPER(:designacao)');
      params.designacao = `%${designacao}%`;
    }
    if (percentual) {
      whereConditions.push('a.TAXA = :percentual');
      params.percentual = percentual;
    }

    const whereClause =
      whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    const countSql = `
      SELECT COUNT(*) as TOTAL
      FROM FK2_DESCONTOS_ESPECIAIS a
      ${whereClause}
    `;

    const countResult = await this.dataSource.query(countSql, params);
    const total = Number(countResult[0]?.TOTAL || 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    // Query principal com paginação (Oracle style)
    const sql = `
      SELECT * FROM (
        SELECT b.*, ROWNUM rnum FROM (
          SELECT
            a.DESCRICAO,
            a.TAXA,
            a.DATA_INICIO,
            a.DATA_FIM,
            a.OBS,
            a.ESTADO,
            a.ID
          FROM FK2_DESCONTOS_ESPECIAIS a
          ${whereClause}
          ORDER BY a.ID DESC
        ) b WHERE ROWNUM <= :upperLimit
      ) WHERE rnum > :lowerLimit
    `;

    params.upperLimit = skip + limit;
    params.lowerLimit = skip;

    const rawData = await this.dataSource.query(sql, params);

    const data = (await toLowerCaseKeys(rawData)).map((item) => ({
      ...item,
      estado: item.estado === 1 || item.estado === '1',
    }));

    // Remover a coluna rnum do retorno
    const cleanedData = data.map(({ rnum, ...rest }) => rest);

    return {
      data: cleanedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateAddDiscount(id: number, updateDto: UpdateAddDiscountDto) {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updateDto.observacao !== undefined) {
      setClauses.push('OBSERVACAO = :observacao');
      params.push(updateDto.observacao);
    }
    if (updateDto.codigoAno !== undefined) {
      setClauses.push('CODIGO_ANOLECTIVO = :codigoAno');
      params.push(updateDto.codigoAno);
    }
    if (updateDto.codigoTaxa !== undefined) {
      setClauses.push('TIPO_TAXA_DESCONTO_ESPECIAL = :codigoTaxa');
      params.push(updateDto.codigoTaxa);
    }
    if (updateDto.codigoInstituicao !== undefined) {
      setClauses.push('INSTITUICAO_ID = :codigoInstituicao');
      params.push(updateDto.codigoInstituicao);
    }
    if (updateDto.semestre !== undefined) {
      setClauses.push('SEMESTRE = :semestre');
      params.push(updateDto.semestre);
    }
    if (updateDto.codigoMatricula !== undefined) {
      setClauses.push('CODIGO_MATRICULA = :codigoMatricula');
      params.push(updateDto.codigoMatricula);
    }

    if (setClauses.length === 0) {
      return { message: 'Nenhum campo para atualizar' };
    }

    const sql = `
      UPDATE FK2_TB_DESCONTOS_ALUNOO
      SET ${setClauses.join(', ')}
      WHERE ID = :id
    `;
    params.push(id);

    await this.dataSource.query(sql, params);
  }

  async findAllAdd(filters: FilterAddDiscountDto): Promise<PagedResult<any>> {
    const {
      page = 1,
      limit = 10,
      codigo,
      codigoAnoLectivo,
      semestre,
      codigoMatricula,
      codigoInstituicao,
      afectacao,
    } = filters;
    const skip = (page - 1) * limit;

    const whereConditions: string[] = [];
    const params: any = {};
    whereConditions.push('a.DELETED_AT IS NULL');
    const TipoPagamento = {
      PAGAMENTO_GLOBAL: {
        valor: null,
        campo: 'PAGAMENTO_GLOBAL',
      },
      PAGAMENTO_PROPINA: {
        valor: 'Pagamento de Propina',
        campo: 'PAGAMENTO_PROPINA',
      },
    } as const;

    // Construção dos filtros
    if (codigo) {
      whereConditions.push('a.TIPO_TAXA_DESCONTO_ESPECIAL = :codigo');
      params.codigo = codigo;
    }

    if (codigoAnoLectivo) {
      whereConditions.push('a.CODIGO_ANOLECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = codigoAnoLectivo;
    }

    if (semestre) {
      whereConditions.push('a.SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    if (codigoMatricula) {
      whereConditions.push('a.CODIGO_MATRICULA = :codigoMatricula');
      params.codigoMatricula = codigoMatricula;
    }
    if (codigoInstituicao) {
      whereConditions.push('d.CODIGO = :codigoInstituicao');
      params.codigoInstituicao = codigoInstituicao;
    }
    if (afectacao) {
      const searchAfectacaoQuery =
        afectacao === 1
          ? `a.AFECTACAO = '${TipoPagamento.PAGAMENTO_PROPINA.valor}'`
          : `a.AFECTACAO IS NULL`;
      whereConditions.push(searchAfectacaoQuery);
    }

    // Lógica para concatenar filtros em uma query que já possui WHERE de joins
    const filtersClause =
      whereConditions.length > 0 ? 'AND ' + whereConditions.join(' AND ') : '';

    // Count Query
    const countSql = `
      SELECT COUNT(*) as TOTAL
      FROM FK2_TB_DESCONTOS_ALUNOO a
         , FK2_TB_TIPO_DESCONTOS b
         , FK2_DESCONTOS_ESPECIAIS c
         , FK2_TB_INSTITUICAO d
         , FK2_TB_ANO_LECTIVO e
         , FK2_TB_MATRICULAS h
         , FK2_TB_ADMISSAO i
         , FK2_TB_PREINSCRICAO j
         , FK2_TB_CURSOS k
      WHERE a.CODIGO_TIPO_DESCONTO = b.CODIGO(+)
        AND a.TIPO_TAXA_DESCONTO_ESPECIAL = c.ID(+)
        AND a.CODIGO_MATRICULA = h.CODIGO(+)
        AND h.CODIGO_ALUNO = i.CODIGO(+)
        AND i.PRE_INCRICAO = j.CODIGO(+)
        AND h.CODIGO_CURSO = k.CODIGO(+)
        AND a.INSTITUICAO_ID = d.CODIGO(+)
        AND a.CODIGO_ANOLECTIVO = e.CODIGO(+)
        ${filtersClause}
    `;

    const countResult = await this.dataSource.query(countSql, params);
    const total = Number(countResult[0]?.TOTAL || 0);
    const totalPages = Math.ceil(total / limit);

    // Otimização: Se não há registros, retorna imediatamente
    if (total === 0) {
      return { data: [], total, page, limit, totalPages };
    }

    // Query Principal Pagina (Oracle style)
    const sql = `
      SELECT * FROM (
                      SELECT b.*, ROWNUM rnum FROM (
                                                     SELECT
                                                       a.CODIGO_MATRICULA,
                                                       j.NOME_COMPLETO,
                                                       j.BILHETE_IDENTIDADE,
                                                       k.DESIGNACAO AS CURSO,
                                                       d.CODIGO AS CODIGO_INSTITUICAO,
                                                       d.INSTITUICAO,
                                                       a.CODIGO_TIPO_DESCONTO,
                                                       c.DESCRICAO,
                                                       a.AFECTACAO,
                                                       a.SEMESTRE,
                                                       c.TAXA,
                                                       a.ISENTAR_MULTA,
                                                       a.CODIGO_UTILIZADOR,
                                                       a.TIPO_TAXA_DESCONTO_ESPECIAL,
                                                       a.CANAL,
                                                       a.CODIGO_ANOLECTIVO,
                                                       e.DESIGNACAO AS ANO_LECTIVO,
                                                       a.OBSERVACAO,
                                                       a.CREATED_AT,
                                                       a.CODIGO
                                                     FROM FK2_TB_DESCONTOS_ALUNOO a
                                                        , FK2_TB_TIPO_DESCONTOS b
                                                        , FK2_DESCONTOS_ESPECIAIS c
                                                        , FK2_TB_INSTITUICAO d
                                                        , FK2_TB_ANO_LECTIVO e
                                                        , FK2_TB_MATRICULAS h
                                                        , FK2_TB_ADMISSAO i
                                                        , FK2_TB_PREINSCRICAO j
                                                        , FK2_TB_CURSOS k
                                                     WHERE a.CODIGO_TIPO_DESCONTO = b.CODIGO(+)
                                                       AND a.TIPO_TAXA_DESCONTO_ESPECIAL = c.ID(+)
                                                       AND a.CODIGO_MATRICULA = h.CODIGO(+)
                                                       AND h.CODIGO_ALUNO = i.CODIGO(+)
                                                       AND i.PRE_INCRICAO = j.CODIGO(+)
                                                       AND h.CODIGO_CURSO = k.CODIGO(+)
                                                       AND a.INSTITUICAO_ID = d.CODIGO(+)
                                                       AND a.CODIGO_ANOLECTIVO = e.CODIGO(+)
                                                       ${filtersClause}
                                                     ORDER BY a.CODIGO DESC
                                                   ) b WHERE ROWNUM <= :upperLimit
                    ) WHERE rnum > :lowerLimit
    `;

    params.upperLimit = skip + limit;
    params.lowerLimit = skip;

    const rawData = await this.dataSource.query(sql, params);

    const data = (await toLowerCaseKeys(rawData)).map((item) => ({
      ...item,
    }));

    const cleanedData = data.map(({ rnum, ...rest }) => rest);

    return {
      data: cleanedData, // Alterado de 'cleanedData' para 'data' para manter padrão
      total,
      page,
      limit,
      totalPages,
    };
  }

  async removeAddDiscount(codigo: number) {
  const checkSql = `
    SELECT 1
    FROM FK2_TB_DESCONTOS_ALUNOO
    WHERE CODIGO = :codigo
      AND DELETED_AT IS NULL
    FETCH FIRST 1 ROWS ONLY
  `;

  const exists = await this.dataSource.query(checkSql, [codigo]);

  if (exists.length === 0) {
    throw new BadRequestException('Desconto não existe.');
  }

  const sql = `
    UPDATE FK2_TB_DESCONTOS_ALUNOO
    SET DELETED_AT = SYSDATE
    WHERE CODIGO = :codigo
      AND DELETED_AT IS NULL
  `;

  await this.dataSource.query(sql, [codigo]);
}


}

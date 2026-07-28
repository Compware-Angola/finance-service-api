import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterTypeServiceDto } from './dto/filter-type-service.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateTypeServiceDto } from './dto/create-type_service.dto';
import { UpdateTypeServiceDto } from './dto/update-type_service.dto';
import { FilterTypeServiceAllDto } from './dto/filter-type-service-all.dto';
import {
  ListServiceByYearDto,
  TipoListagemServico,
} from './dto/ListServiceByYearDto';
import { CreateTypeServiceMassDto } from './dto/CreateTypeServiceMassDto';
export interface ServicoProcessado {
  descricao: string;
  sigla?: string;
  codigoAnoLectivo: number;
  poloId: number;
  status?: string;
  motivo?: string;
}
@Injectable()
export class TypeServiceService {
  constructor(private readonly dataSource: DataSource) {}
  async findTipoServicosDropdown({
    sigla,
    codigoAnoLectivo,
    estado,
    tipoServico,
    visualizarNoPortal,
    descricao,
  }: FilterTypeServiceDto) {
    const whereConditions: string[] = [];
    const params: any = {};

    /** 🔍 Filtros */
    whereConditions.push('TS.SIGLA IS NOT NULL');
    if (sigla) {
      whereConditions.push('UPPER(TS.SIGLA) = UPPER(:sigla)');
      params.sigla = sigla;
    }

    if (descricao) {
      whereConditions.push('UPPER(TS.DESCRICAO) LIKE UPPER(:descricao)');
      params.descricao = `%${descricao}%`;
    }

    if (codigoAnoLectivo !== undefined) {
      whereConditions.push('TS.CODIGO_ANO_LECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = codigoAnoLectivo;
    }

    if (estado !== undefined) {
      whereConditions.push('TS.ESTADO = :estado');
      params.estado = estado;
    }

    if (tipoServico !== undefined) {
      whereConditions.push('TS.TIPOSERVICO = :tipoServico');
      params.tipoServico = tipoServico;
    }

    if (visualizarNoPortal !== undefined) {
      whereConditions.push('TS.VISUALIZAR_NO_PORTAL = :visualizarNoPortal');
      params.visualizarNoPortal = visualizarNoPortal;
    }

    const whereClause =
      whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    const sql = `
    SELECT
      TS.CODIGO,
      TS.SIGLA,
      TS.DESCRICAO,
      TS.PRECO,
      TS.TIPOSERVICO,
      TS.CODIGO_ANO_LECTIVO,
      TS.ESTADO,
      TS.DATA,
      TS.DATACRIACAO,
      TS.DISPONIBILIZAR_ALUNO,
      TS.VISUALIZAR_NO_PORTAL,
      TS.POLO_ID,
      TS.CANAL,
      TS.MESTRADO,
      TS.CODIGO_GRADE_CURRILULAR,
      TS.TIPO_CANDIDATURA
    FROM FK2_TB_TIPO_SERVICOS TS
    ${whereClause}
    ORDER BY TS.CODIGO ASC
  `;

    const result = await this.dataSource.query(sql, params);

    return await toLowerCaseKeys(result);
  }
  async findTipoServicos({
    sigla,
    codigoAnoLectivo,
    estado,
    polo,
    tipoServico,
    visualizarNoPortal,
    descricao,
    page = 1,
    limit = 10,
    tipoCandidatura,
  }: FilterTypeServiceAllDto) {
    const whereConditions: string[] = [];
    const params: any = {};

    /** 🔍 Filtros */
    whereConditions.push('TS.SIGLA IS NOT NULL');
    whereConditions.push(`UPPER(TS.SIGLA) <> UPPER('PROP')`);
    if (tipoCandidatura !== undefined) {
      whereConditions.push('TS.TIPO_CANDIDATURA = :tipoCandidatura');
      params.tipoCandidatura = tipoCandidatura;
    }

    if (sigla) {
      whereConditions.push('UPPER(TS.SIGLA) = UPPER(:sigla)');
      params.sigla = sigla;
    }
    if (polo !== undefined && polo != 3) {
      whereConditions.push('TS.POLO_ID = :polo');
      params.polo = polo;
    }
    if (polo !== undefined && polo == 4) {
      //Estado para indefinido
      whereConditions.push('TS.POLO_ID =:polo');
      params.polo = polo;
    }

    if (descricao) {
      whereConditions.push('UPPER(TS.DESCRICAO) LIKE UPPER(:descricao)');
      params.descricao = `%${descricao}%`;
    }

    if (codigoAnoLectivo !== undefined) {
      whereConditions.push('TS.CODIGO_ANO_LECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = codigoAnoLectivo;
    }

    if (estado !== undefined) {
      whereConditions.push('TS.ESTADO = :estado');
      params.estado = estado;
    }

    if (tipoServico !== undefined) {
      whereConditions.push('TS.TIPOSERVICO = :tipoServico');
      params.tipoServico = tipoServico;
    }

    if (visualizarNoPortal !== undefined) {
      whereConditions.push('TS.VISUALIZAR_NO_PORTAL = :visualizarNoPortal');
      params.visualizarNoPortal = visualizarNoPortal;
    }

    const whereClause =
      whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    /** 📊 Total de registos */
    const countSql = `
    SELECT COUNT(1) TOTAL
    FROM FK2_TB_TIPO_SERVICOS TS
    ${whereClause}
  `;

    const [{ TOTAL }] = await this.dataSource.query(countSql, params);

    /** 📄 Paginação */
    const offset = (page - 1) * limit;

    params.offset = offset;
    params.limit = limit;

    const sql = `
    SELECT
      TS.CODIGO,
      TS.SIGLA,
      TS.DESCRICAO,
      TS.PRECO,
      TS.TIPOSERVICO,
      TS.CODIGO_ANO_LECTIVO,
      TS.ESTADO,
      TS.DATA,
      TS.DATACRIACAO,
      TS.DISPONIBILIZAR_ALUNO,
      TS.VISUALIZAR_NO_PORTAL,
      TS.POLO_ID,
      TS.TAXA_IVA_ID,
      TS.MOTIVO_ISENCAO_IVA_CODIGO,
      TS.CANAL,
      TS.MESTRADO,
      TS.CODIGO_GRADE_CURRILULAR,
      TS.TIPO_CANDIDATURA,
      POLO.DESIGNACAO AS polo,
      al.DESIGNACAO    AS ano_lectivo
    FROM FK2_TB_TIPO_SERVICOS TS
    LEFT JOIN FK2_POLOS POLO ON POLO.ID =TS.POLO_ID
    LEFT JOIN  FK2_TB_ANO_LECTIVO  al ON al.CODIGO = TS.CODIGO_ANO_LECTIVO
    ${whereClause}
    ORDER BY TS.CODIGO ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const result = await this.dataSource.query(sql, params);

    return {
      data: await toLowerCaseKeys(result),
      total: Number(TOTAL),
      page,
      limit,
      lastPage: Math.ceil(TOTAL / limit),
    };
  }
  async findTipoMonthlyFee({
    codigoAnoLectivo,
    estado,
    polo,
    descricao,
    tipoCandidatura,
    page = 1,
    limit = 10,
  }: FilterTypeServiceAllDto) {
    const whereConditions: string[] = [];
    const params: any = {};
    const sigla = 'PROP';

    /** 🔍 Filtros */
    whereConditions.push('TS.SIGLA IS NOT NULL');

    if (sigla) {
      whereConditions.push('UPPER(TS.SIGLA) = UPPER(:sigla)');
      params.sigla = sigla;
    }
    if (tipoCandidatura !== undefined) {
      whereConditions.push('TS.TIPO_CANDIDATURA = :tipoCandidatura');
      params.tipoCandidatura = tipoCandidatura;
    }
    if (polo !== undefined && polo != 3) {
      whereConditions.push('TS.POLO_ID = :polo');
      params.polo = polo;
    }
    if (polo !== undefined && polo == 4) {
      whereConditions.push('TS.POLO_ID = :polo');
      params.polo = polo;
    }
    if (descricao) {
      whereConditions.push('UPPER(TS.DESCRICAO) LIKE UPPER(:descricao)');
      params.descricao = `%${descricao}%`;
    }

    if (codigoAnoLectivo !== undefined) {
      whereConditions.push('TS.CODIGO_ANO_LECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = codigoAnoLectivo;
    }

    if (estado !== undefined) {
      whereConditions.push('TS.ESTADO = :estado');
      params.estado = estado;
    }

    const whereClause =
      whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    /** 📊 Total de registos */
    const countSql = `
    SELECT COUNT(1) TOTAL
    FROM FK2_TB_TIPO_SERVICOS TS
    ${whereClause}
  `;

    const [{ TOTAL }] = await this.dataSource.query(countSql, params);

    /** 📄 Paginação */
    const offset = (page - 1) * limit;

    params.offset = offset;
    params.limit = limit;

    const sql = `
    SELECT
      TS.CODIGO,
      TS.SIGLA,
      TS.DESCRICAO,
      TS.PRECO,
      TS.TIPOSERVICO,
      TS.CODIGO_ANO_LECTIVO,
      TS.ESTADO,
      TS.DATA,
      TS.DATACRIACAO,
      TS.DISPONIBILIZAR_ALUNO,
      TS.VISUALIZAR_NO_PORTAL,
      TS.POLO_ID,
        TS.TAXA_IVA_ID,
        TS.MOTIVO_ISENCAO_IVA_CODIGO,
      TS.CANAL,
      TS.MESTRADO,
      TS.CODIGO_GRADE_CURRILULAR,
      TS.TIPO_CANDIDATURA,
      POLO.DESIGNACAO AS polo
    FROM FK2_TB_TIPO_SERVICOS TS
    LEFT JOIN FK2_POLOS POLO ON POLO.ID =TS.POLO_ID
    ${whereClause}
    ORDER BY TS.CODIGO ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const result = await this.dataSource.query(sql, params);

    return {
      data: await toLowerCaseKeys(result),
      total: Number(TOTAL),
      page,
      limit,
      lastPage: Math.ceil(TOTAL / limit),
    };
  }
  async create(createDto: CreateTypeServiceDto) {
    const sql = `
      INSERT INTO FK2_TB_TIPO_SERVICOS (
        TAXA_IVA_ID,
        MOTIVO_ISENCAO_IVA_CODIGO,
        PRECO,
        DESCRICAO,
        TIPOSERVICO,
        DATACRIACAO,
        ESTADO,
        DATA,
        DISPONIBILIZAR_ALUNO,
        CODIGO_GRADE_CURRILULAR,
        MESTRADO,
        CANAL,
        POLO_ID,
        CACUACO,
        CODIGO_ANO_LECTIVO,
        VALOR_ANTERIOR,
        VISUALIZAR_NO_PORTAL,
        SIGLA,
        ESTADO_SOLICITACAO,
        TIPO_CANDIDATURA
      )
      VALUES (
        :taxaIvaId,
        :motivoIsencaoIvaCodigo,
        :preco,
        :descricao,
        :tipoServico,
        SYSDATE,
        :estado,
        TO_DATE(:data, 'YYYY-MM-DD'),
        :disponibilizarAluno,
        :codigoGradeCurricular,
        :mestrado,
        :canal,
        :poloId,
        :cacuaco,
        :codigoAnoLectivo,
        :valorAnterior,
        :visualizarNoPortal,
        :sigla,
        :estadoSolicitacao,
        :tipoCandidatura
      )
    `;

    const params: any = {
      taxaIvaId: createDto.taxaIvaId,
      motivoIsencaoIvaCodigo: createDto.motivoIsencaoIvaCodigo,
      preco: createDto.preco,
      descricao: createDto.descricao ?? null,
      tipoServico: createDto.tipoServico ?? null,
      estado: (createDto.estado ?? true) ? 'Ativo' : 'Inativo',
      data: createDto.data
        ? new Date(createDto.data).toISOString().split('T')[0]
        : null,
      disponibilizarAluno:
        (createDto.disponibilizarAluno ?? true) ? 'SIM' : 'NAO',
      codigoGradeCurricular: createDto.codigoGradeCurricular ?? null,
      mestrado: createDto.mestrado ? 'SIM' : 'NAO',
      canal: createDto.canal ?? null,
      poloId: createDto.poloId,
      cacuaco: createDto.cacuaco ? 'SIM' : 'NAO',
      codigoAnoLectivo: createDto.codigoAnoLectivo,
      valorAnterior: createDto.valorAnterior ?? null,
      visualizarNoPortal:
        (createDto.visualizarNoPortal ?? true) ? 'SIM' : 'NAO',
      sigla: createDto.sigla,
      estadoSolicitacao: createDto.estadoSolicitacao ?? null,
      tipoCandidatura: createDto.tipoCandidatura ?? null,
    };

    await this.dataSource.query(sql, params);
  }

  async update(codigo: number, updateDto: UpdateTypeServiceDto) {
    const setClauses: string[] = [];
    const params: any = { codigo };

    if (updateDto.taxaIvaId !== undefined) {
      setClauses.push('TAXA_IVA_ID = :taxaIvaId');
      params.taxaIvaId = updateDto.taxaIvaId;
    }

    if (updateDto.motivoIsencaoIvaCodigo !== undefined) {
      setClauses.push('MOTIVO_ISENCAO_IVA_CODIGO = :motivoIsencaoIvaCodigo');
      params.motivoIsencaoIvaCodigo = updateDto.motivoIsencaoIvaCodigo;
    }

    if (updateDto.preco !== undefined) {
      setClauses.push('PRECO = :preco');
      params.preco = updateDto.preco;
    }

    if (updateDto.descricao !== undefined) {
      setClauses.push('DESCRICAO = :descricao');
      params.descricao = updateDto.descricao;
    }

    if (updateDto.tipoServico !== undefined) {
      setClauses.push('TIPOSERVICO = :tipoServico');
      params.tipoServico = updateDto.tipoServico;
    }

    if (updateDto.estado !== undefined) {
      setClauses.push('ESTADO = :estado');
      params.estado = updateDto.estado ? 'Ativo' : 'Inativo';
    }

    if (updateDto.data !== undefined) {
      setClauses.push("DATA = TO_DATE(:data, 'YYYY-MM-DD')");
      params.data = updateDto.data
        ? new Date(updateDto.data).toISOString().split('T')[0]
        : null;
    }

    if (updateDto.disponibilizarAluno !== undefined) {
      setClauses.push('DISPONIBILIZAR_ALUNO = :disponibilizarAluno');
      params.disponibilizarAluno = updateDto.disponibilizarAluno
        ? 'SIM'
        : 'NAO';
    }

    if (updateDto.codigoGradeCurricular !== undefined) {
      setClauses.push('CODIGO_GRADE_CURRILULAR = :codigoGradeCurricular');
      params.codigoGradeCurricular = updateDto.codigoGradeCurricular;
    }

    if (updateDto.mestrado !== undefined) {
      setClauses.push('MESTRADO = :mestrado');
      params.mestrado = updateDto.mestrado ? 'SIM' : 'NAO';
    }

    if (updateDto.canal !== undefined) {
      setClauses.push('CANAL = :canal');
      params.canal = updateDto.canal;
    }

    if (updateDto.poloId !== undefined) {
      setClauses.push('POLO_ID = :poloId');
      params.poloId = updateDto.poloId;
    }

    if (updateDto.cacuaco !== undefined) {
      setClauses.push('CACUACO = :cacuaco');
      params.cacuaco = updateDto.cacuaco ? 'SIM' : 'NAO';
    }

    if (updateDto.codigoAnoLectivo !== undefined) {
      setClauses.push('CODIGO_ANO_LECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = updateDto.codigoAnoLectivo;
    }

    if (updateDto.valorAnterior !== undefined) {
      setClauses.push('VALOR_ANTERIOR = :valorAnterior');
      params.valorAnterior = updateDto.valorAnterior;
    }

    if (updateDto.visualizarNoPortal !== undefined) {
      setClauses.push('VISUALIZAR_NO_PORTAL = :visualizarNoPortal');
      params.visualizarNoPortal = updateDto.visualizarNoPortal ? 'SIM' : 'NAO';
    }

    if (updateDto.sigla !== undefined) {
      setClauses.push('SIGLA = :sigla');
      params.sigla = updateDto.sigla;
    }

    if (updateDto.estadoSolicitacao !== undefined) {
      setClauses.push('ESTADO_SOLICITACAO = :estadoSolicitacao');
      params.estadoSolicitacao = updateDto.estadoSolicitacao;
    }

    if (updateDto.tipoCandidatura !== undefined) {
      setClauses.push('TIPO_CANDIDATURA = :tipoCandidatura');
      params.tipoCandidatura = updateDto.tipoCandidatura;
    }

    if (!setClauses.length) {
      return;
    }

    const sql = `
    UPDATE FK2_TB_TIPO_SERVICOS
    SET
      ${setClauses.join(', ')}
    WHERE CODIGO = :codigo
  `;

    await this.dataSource.query(sql, params);
  }
  async listByAnoLectivo({ codigoAnoLectivo, tipo }: ListServiceByYearDto) {
    const params: any = {
      codigoAnoLectivo,
    };

    let filtroTipo = '';

    if (tipo === TipoListagemServico.MENSALIDADE) {
      filtroTipo = `
      AND TS.SIGLA IS NOT NULL
      AND UPPER(TS.SIGLA) = 'PROP'
    `;
    } else {
      filtroTipo = `
      AND (
        TS.SIGLA IS NULL
        OR UPPER(TS.SIGLA) <> 'PROP'
      )
    `;
    }

    const sql = `
  SELECT
    TS.CODIGO,
    TS.TAXA_IVA_ID,
    TS.MOTIVO_ISENCAO_IVA_CODIGO,
    TS.PRECO,
    TS.DESCRICAO,
    TS.TIPOSERVICO,
    TS.DATACRIACAO,
    TS.ESTADO,
    TS.DATA,
    TS.DISPONIBILIZAR_ALUNO,
    TS.CODIGO_GRADE_CURRILULAR,
    TS.MESTRADO,
    TS.CANAL,
    TS.POLO_ID,
    TS.CACUACO,
    TS.CODIGO_ANO_LECTIVO,
    TS.VALOR_ANTERIOR,
    TS.VISUALIZAR_NO_PORTAL,
    TS.SIGLA,
    TS.ESTADO_SOLICITACAO,
    TS.TIPO_CANDIDATURA,
    PO.DESIGNACAO AS POLO_DESIGNACAO,
    AL.DESIGNACAO AS ANOLECTIVO
  FROM FK2_TB_TIPO_SERVICOS TS
  LEFT JOIN FK2_POLOS PO
  ON PO.ID = TS.POLO_ID
  LEFT JOIN FK2_TB_ANO_LECTIVO AL
  ON AL.CODIGO = TS.CODIGO_ANO_LECTIVO
  WHERE TS.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    AND TS.ESTADO = 'Ativo'
   AND TS.DESCRICAO IS NOT NULL
AND DBMS_LOB.GETLENGTH(TS.DESCRICAO) > 0
    ${filtroTipo}
  ORDER BY TS.CODIGO
`;

    const result = await this.dataSource.query(sql, params);

    return toLowerCaseKeys(result);
  }
  async createMass(createDto: CreateTypeServiceMassDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const cadastrados: ServicoProcessado[] = [];
    const duplicados: ServicoProcessado[] = [];

    try {
      const checkSql = `
  SELECT TS.CODIGO
FROM FK2_TB_TIPO_SERVICOS TS
WHERE TS.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
  AND TS.POLO_ID = :poloId
  AND NVL(TS.SIGLA, '-') = NVL(:sigla, '-')
  AND DBMS_LOB.SUBSTR(TS.DESCRICAO, 4000, 1) = :descricao
    `;

      const insertSql = `
      INSERT INTO FK2_TB_TIPO_SERVICOS (
        TAXA_IVA_ID,
        MOTIVO_ISENCAO_IVA_CODIGO,
        PRECO,
        DESCRICAO,
        TIPOSERVICO,
        DATACRIACAO,
        ESTADO,
        DATA,
        DISPONIBILIZAR_ALUNO,
        CODIGO_GRADE_CURRILULAR,
        MESTRADO,
        CANAL,
        POLO_ID,
        CACUACO,
        CODIGO_ANO_LECTIVO,
        VALOR_ANTERIOR,
        VISUALIZAR_NO_PORTAL,
        SIGLA,
        ESTADO_SOLICITACAO,
        TIPO_CANDIDATURA
      )
      VALUES (
        :taxaIvaId,
        :motivoIsencaoIvaCodigo,
        :preco,
        :descricao,
        :tipoServico,
        SYSDATE,
        :estado,
        TO_DATE(:data, 'YYYY-MM-DD'),
        :disponibilizarAluno,
        :codigoGradeCurricular,
        :mestrado,
        :canal,
        :poloId,
        :cacuaco,
        :codigoAnoLectivo,
        :valorAnterior,
        :visualizarNoPortal,
        :sigla,
        :estadoSolicitacao,
        :tipoCandidatura
      )
    `;

      for (const item of createDto.services) {
        const existe: any = await queryRunner.query(checkSql, {
          codigoAnoLectivo: item.codigoAnoLectivo,
          poloId: item.poloId ?? null,
          sigla: item.sigla ?? null,
          descricao: item.descricao ?? null,
        } as any);

        if (existe.length > 0) {
          duplicados.push({
            descricao: item.descricao,
            sigla: item.sigla,
            codigoAnoLectivo: item.codigoAnoLectivo,
            poloId: item.poloId ?? 0,
            motivo: 'Serviço já cadastrado neste ano lectivo',
          });

          continue;
        }

        const params = {
          taxaIvaId: item.taxaIvaId,
          motivoIsencaoIvaCodigo: item.motivoIsencaoIvaCodigo,
          preco: item.preco,
          descricao: item.descricao ?? null,
          tipoServico: item.tipoServico ?? null,

          estado: (item.estado ?? true) ? 'Ativo' : 'Inativo',

          data: item.data
            ? new Date(item.data).toISOString().split('T')[0]
            : null,

          disponibilizarAluno:
            (item.disponibilizarAluno ?? true) ? 'SIM' : 'NAO',

          codigoGradeCurricular: item.codigoGradeCurricular ?? undefined,

          mestrado: item.mestrado ? 'SIM' : 'NAO',

          canal: item.canal ?? null,

          poloId: item.poloId,

          cacuaco: item.cacuaco ? 'SIM' : 'NAO',

          codigoAnoLectivo: item.codigoAnoLectivo,

          valorAnterior: item.valorAnterior ?? null,

          visualizarNoPortal: (item.visualizarNoPortal ?? true) ? 'SIM' : 'NAO',

          sigla: item.sigla ?? null,

          estadoSolicitacao: item.estadoSolicitacao ?? null,

          tipoCandidatura: item.tipoCandidatura ?? null,
        };

        await queryRunner.query(insertSql, params as any);

        cadastrados.push({
          descricao: item.descricao,
          sigla: item.sigla,
          codigoAnoLectivo: item.codigoAnoLectivo!,
          poloId: item.poloId ?? 0,
          status: 'Cadastrado',
        });
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Processamento concluído',
        totalRecebidos: createDto.services.length,
        totalCadastrados: cadastrados.length,
        totalDuplicados: duplicados.length,
        cadastrados,
        duplicados,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

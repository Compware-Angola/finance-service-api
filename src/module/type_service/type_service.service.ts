import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterTypeServiceDto } from './dto/filter-type-service.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateTypeServiceDto } from './dto/create-type_service.dto';
import { UpdateTypeServiceDto } from './dto/update-type_service.dto';
import { FilterTypeServiceAllDto } from './dto/filter-type-service-all.dto';

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
  tipoServico,
  visualizarNoPortal,
  descricao,
  page = 1,
  limit = 10,
}: FilterTypeServiceAllDto) {
  const whereConditions: string[] = [];
  const params: any = {};

  /** 🔍 Filtros */
  whereConditions.push('TS.SIGLA IS NOT NULL');
whereConditions.push(`UPPER(TS.SIGLA) <> UPPER('PROP')`);


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
    whereConditions.push(
      'TS.VISUALIZAR_NO_PORTAL = :visualizarNoPortal',
    );
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
      TS.CANAL,
      TS.MESTRADO,
      TS.CODIGO_GRADE_CURRILULAR,
      TS.TIPO_CANDIDATURA
    FROM FK2_TB_TIPO_SERVICOS TS
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
  descricao,
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
      TS.CANAL,
      TS.MESTRADO,
      TS.CODIGO_GRADE_CURRILULAR,
      TS.TIPO_CANDIDATURA
    FROM FK2_TB_TIPO_SERVICOS TS
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

    if (updateDto.preco !== undefined) {
      setClauses.push('PRECO = :preco');
      params.preco = updateDto.preco;
    }

    if (updateDto.descricao !== undefined) {
      setClauses.push('DESCRICAO = :descricao');
      params.descricao = updateDto.descricao;
    }

    if (updateDto.estado !== undefined) {
      setClauses.push('ESTADO = :estado');
      params.estado = updateDto.estado ? 'Ativo' : 'Inativo';
    }

    if (updateDto.poloId !== undefined) {
      setClauses.push('POLO_ID = :poloId');
      params.poloId = updateDto.poloId;
    }

    if (updateDto.motivoIsencaoIvaCodigo !== undefined) {
      setClauses.push('MOTIVO_ISENCAO_IVA_CODIGO = :motivoIsencaoIvaCodigo');
      params.motivoIsencaoIvaCodigo = updateDto.motivoIsencaoIvaCodigo;
    }

    if (updateDto.codigoAnoLectivo !== undefined) {
      setClauses.push('CODIGO_ANO_LECTIVO = :codigoAnoLectivo');
      params.codigoAnoLectivo = updateDto.codigoAnoLectivo;
    }

    const sql = `
      UPDATE FK2_TB_TIPO_SERVICOS 
      SET ${setClauses.join(', ')}
      WHERE CODIGO = :codigo
    `;

    await this.dataSource.query(sql, params);
  }
  async delete(codigo:number){
  
  }
}

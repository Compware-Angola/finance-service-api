import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterTypeServiceDto } from './dto/filter-type-service.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

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
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as oracledb from 'oracledb';
import { DataSource } from 'typeorm';
import { UpdateContratoBolsaDto } from './dto/UpdateContratoBolsaDto';
import { CreateContratoBolsaDto } from './dto/CreateContratoBolsaDto';
import {
  ContratoBolsaEstatisticasQueryDto,
  ListContratoBolsaQueryDto,
} from './dto/ListContratoBolsaQueryDto';
@Injectable()
export class InstitutionalContractService {
  constructor(private readonly dataSource: DataSource) {}
  private async verificarInstituicaoExiste(
    queryRunner: any,
    codigoInstituicao: number,
  ): Promise<void> {
    const instituicaoExiste = await queryRunner.query(
      `SELECT CODIGO FROM FK2_TB_INSTITUICAO WHERE CODIGO = :codigoInstituicao`,
      { codigoInstituicao } as any,
    );

    if (!instituicaoExiste || instituicaoExiste.length === 0) {
      throw new BadRequestException(
        `Não foi encontrada instituição com código ${codigoInstituicao}`,
      );
    }
  }
  async createContratoBolsa(dto: CreateContratoBolsaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.verificarInstituicaoExiste(queryRunner, dto.codigoInstituicao);
      const codigosBolsa = dto.bolsas.map((item) => item.codigoBolsa);
      const bolsasEmConflito = await this.instituicaoTemContratoBolsa(
        dto.codigoInstituicao,
        codigosBolsa,
      );
      console.log('conflitos', bolsasEmConflito);
      const bolsasParaCriar = dto.bolsas.filter(
        (item) =>
          !bolsasEmConflito.some(
            (b) => Number(b.codigoBolsa) === Number(item.codigoBolsa),
          ),
      );
      if (bolsasParaCriar.length === 0) {
        throw new BadRequestException({
          message:
            'Todas as bolsas selecionadas já possuem contrato ativo com esta instituição',
          bolsasEmConflito,
        });
      }

      const sql = `
        INSERT INTO TB_CONTRATO_BOLSA (
          CODIGO_INSTITUICAO,
          DATA_INICIO,
          DATA_FIM,
          ESTADO
        ) VALUES (
          :codigoInstituicao,
          TO_DATE(:dataInicio, 'YYYY-MM-DD'),
          TO_DATE(:dataFim, 'YYYY-MM-DD'),
          :estado
        ) RETURNING CODIGO_CONTRATO INTO :outId
      `;

      const result = await queryRunner.query(sql, {
        codigoInstituicao: dto.codigoInstituicao,
        dataInicio: dto.dataInicio,
        dataFim: dto.dataFim,
        estado: dto.estado ?? 1,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any);

      if (!result.outId || result.outId.length === 0) {
        throw new BadRequestException(
          'Falha ao obter o código do contrato inserido.',
        );
      }

      const codigoContratoCriado: number = result.outId[0];

      const sqlItem = `
        INSERT INTO TB_CONTRATO_BOLSA_ITEM (
          CODIGO_CONTRATO,
          CODIGO_BOLSA,
          NUMERO_MAXIMO_ESTUDANTE
        ) VALUES (
          :codigoContrato,
          :codigoBolsa,
          :numeroMaximoEstudante
        )
      `;

      for (const item of bolsasParaCriar) {
        await queryRunner.query(sqlItem, {
          codigoContrato: codigoContratoCriado,
          codigoBolsa: item.codigoBolsa,
          numeroMaximoEstudante: item.numeroMaximoEstudante,
        } as any);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Contrato de bolsa criado com sucesso',
        data: {
          codigoContrato: codigoContratoCriado,
        },
        bolsasIgnoradas:
          bolsasEmConflito.length > 0 ? bolsasEmConflito : undefined,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao criar contrato de bolsa:', error);
      throw new BadRequestException(
        `Falha ao criar contrato de bolsa: ${error?.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async editarContratoBolsa(
    codigoContrato: number,
    dto: UpdateContratoBolsaDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existente = await queryRunner.query(
        `SELECT CODIGO_CONTRATO FROM TB_CONTRATO_BOLSA WHERE CODIGO_CONTRATO = :codigoContrato`,
        { codigoContrato: codigoContrato } as any,
      );
      if (!existente || existente.length === 0) {
        throw new NotFoundException(
          `Não foi encontrado contrato de bolsa com código ${codigoContrato}`,
        );
      }

      const campos: string[] = [];
      const params: Record<string, any> = {
        codigoContrato: codigoContrato,
      };

      if (dto.codigoInstituicao !== undefined) {
        campos.push('CODIGO_INSTITUICAO = :codigoInstituicao');
        params.codigoInstituicao = dto.codigoInstituicao;
      }
      if (dto.dataInicio !== undefined) {
        campos.push(`DATA_INICIO = TO_DATE(:dataInicio, 'YYYY-MM-DD')`);
        params.dataInicio = dto.dataInicio;
      }
      if (dto.dataFim !== undefined) {
        campos.push(`DATA_FIM = TO_DATE(:dataFim, 'YYYY-MM-DD')`);
        params.dataFim = dto.dataFim;
      }
      if (dto.estado !== undefined) {
        campos.push('ESTADO = :estado');
        params.estado = dto.estado;
      }

      if (campos.length > 0) {
        const sqlUpdate = `
          UPDATE TB_CONTRATO_BOLSA
          SET ${campos.join(',\n              ')}
          WHERE CODIGO_CONTRATO = :codigoContrato
        `;
        await queryRunner.query(sqlUpdate, params as any);
      }

      if (dto.bolsas !== undefined) {
        await queryRunner.query(
          `DELETE FROM TB_CONTRATO_BOLSA_ITEM WHERE CODIGO_CONTRATO = :codigoContrato`,
          { codigoContrato: codigoContrato } as any,
        );

        if (dto.bolsas.length > 0) {
          const sqlItem = `
            INSERT INTO TB_CONTRATO_BOLSA_ITEM (
              CODIGO_CONTRATO,
              CODIGO_BOLSA,
              NUMERO_MAXIMO_ESTUDANTE
            ) VALUES (
              :codigoContrato,
              :codigoBolsa,
              :numeroMaximoEstudante
            )
          `;

          for (const item of dto.bolsas) {
            await queryRunner.query(sqlItem, {
              codigoContrato: codigoContrato,
              codigoBolsa: item.codigoBolsa,
              numeroMaximoEstudante: item.numeroMaximoEstudante,
            } as any);
          }
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Contrato de bolsa atualizado com sucesso',
        data: {
          codigoContrato: codigoContrato,
        },
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao editar contrato de bolsa:', error);
      throw new BadRequestException(
        `Falha ao editar contrato de bolsa: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async deleteContratoBolsa(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE TB_CONTRATO_BOLSA
   SET DELETED_AT = SYSDATE
   WHERE CODIGO_CONTRATO = :codigoContrato`,
        { codigoContrato: id } as any,
      );
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao apagar contrato de bolsa:', error);
      throw new BadRequestException(
        `Falha ao apagar contrato de bolsa: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
  async obterEstatisticasContratosBolsa(
    filtros: ContratoBolsaEstatisticasQueryDto,
  ) {
    const { codigoInstituicao, codigoContrato } = filtros;

    let condicoes = '';
    const params: Record<string, any> = {};
    condicoes += ' AND cb.DELETED_AT is null';
    if (codigoInstituicao !== undefined) {
      condicoes += ' AND cb.CODIGO_INSTITUICAO = :codigoInstituicao';
      params.codigoInstituicao = codigoInstituicao;
    }
    if (codigoContrato !== undefined) {
      condicoes += ' AND cb.CODIGO_CONTRATO = :codigoContrato';
      params.codigoContrato = codigoContrato;
    }

    const sql = `
      SELECT
        SUM(CASE WHEN cb.ESTADO = 1
                  AND cb.DATA_FIM >= TRUNC(SYSDATE)
                 THEN 1 ELSE 0 END)                         AS ATIVOS,
        SUM(CASE WHEN cb.ESTADO = 1
                  AND cb.DATA_FIM >= TRUNC(SYSDATE)
                  AND cb.DATA_FIM <= TRUNC(SYSDATE) + 30
                 THEN 1 ELSE 0 END)                         AS AEXPIRAR,
        SUM(CASE WHEN cb.DATA_FIM < TRUNC(SYSDATE)
                 THEN 1 ELSE 0 END)                         AS EXPIRADOS,
        COUNT(1)                                            AS TOTAL
      FROM TB_CONTRATO_BOLSA cb
      INNER JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = cb.CODIGO_INSTITUICAO
      WHERE 1=1
      ${condicoes}
    `;

    const result = await this.dataSource.query(sql, params as any);
    const row = result[0] ?? {};

    return {
      ativos: Number(row.ATIVOS ?? 0),
      aExpirar: Number(row.AEXPIRAR ?? 0),
      expirados: Number(row.EXPIRADOS ?? 0),
      total: Number(row.TOTAL ?? 0),
    };
  }
  async alternarEstadoContratoBolsa(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existente = await queryRunner.query(
        `SELECT CODIGO_CONTRATO, ESTADO
           FROM TB_CONTRATO_BOLSA
          WHERE CODIGO_CONTRATO = :codigoContrato
            AND DELETED_AT IS NULL`,
        { codigoContrato: id } as any,
      );

      if (!existente || existente.length === 0) {
        throw new NotFoundException(
          `Não foi encontrado contrato de bolsa com código ${id}`,
        );
      }

      const estadoAtual = Number(existente[0].ESTADO);
      const novoEstado = estadoAtual === 1 ? 0 : 1;

      await queryRunner.query(
        `UPDATE TB_CONTRATO_BOLSA
            SET ESTADO = :novoEstado
          WHERE CODIGO_CONTRATO = :codigoContrato`,
        { novoEstado, codigoContrato: id } as any,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message:
          novoEstado === 1
            ? 'Contrato de bolsa ativado com sucesso'
            : 'Contrato de bolsa desativado com sucesso',
        data: {
          codigoContrato: id,
          estado: novoEstado,
        },
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao alternar estado do contrato de bolsa:', error);
      throw new BadRequestException(
        `Falha ao alternar estado do contrato de bolsa: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async listarContratosBolsa(filtros: ListContratoBolsaQueryDto) {
    const {
      codigoInstituicao,
      codigoContrato,
      limit = 10,
      page = 1,
      situacao,
    } = filtros;

    const offset = (page - 1) * limit;
    let condicoes = '';
    const params: Record<string, any> = {};
    condicoes += ' AND cb.DELETED_AT is null';
    if (codigoInstituicao !== undefined) {
      condicoes += ' AND cb.CODIGO_INSTITUICAO = :codigoInstituicao';
      params.codigoInstituicao = codigoInstituicao;
    }
    if (codigoContrato !== undefined) {
      condicoes += ' AND cb.CODIGO_CONTRATO = :codigoContrato';
      params.codigoContrato = codigoContrato;
    }

    if (situacao == 1) {
      condicoes += ' AND cb.ESTADO = 1  AND cb.DATA_FIM >= TRUNC(SYSDATE)';
    }
    if (situacao == 0) {
      condicoes += ' AND cb.DATA_FIM < TRUNC(SYSDATE)';
    }

    const baseJoins = `
      FROM TB_CONTRATO_BOLSA cb
      INNER JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = cb.CODIGO_INSTITUICAO
      WHERE 1=1
      ${condicoes}
    `;

    const sqlContratos = `
      SELECT
        cb.CODIGO_CONTRATO     as codigoContrato,
        cb.CODIGO_INSTITUICAO  as codigoInstituicao,
        i.INSTITUICAO          as instituicao,
        cb.DATA_INICIO         as dataInicio,
        cb.DATA_FIM            as dataFim,
        cb.ESTADO              as estado
      ${baseJoins}
      ORDER BY cb.CODIGO_CONTRATO DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const sqlCount = `
      SELECT COUNT(1) AS TOTAL
      ${baseJoins}
    `;

    const [contratos, countResult] = await Promise.all([
      this.dataSource.query(sqlContratos, { ...params, offset, limit } as any),
      this.dataSource.query(sqlCount, params as any),
    ]);

    const total = Number(countResult[0].TOTAL);

    if (!contratos || contratos.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const codigosContrato: number[] = contratos.map(
      (c: any) => c.CODIGOCONTRATO,
    );
    const itensPorContrato = await this.obterItensPorContratos(codigosContrato);

    const data = contratos.map((c: any) => ({
      codigoContrato: c.CODIGOCONTRATO,
      codigoInstituicao: c.CODIGOINSTITUICAO,
      instituicao: c.INSTITUICAO,
      dataInicio: c.DATAINICIO,
      dataFim: c.DATAFIM,
      estado: c.ESTADO,
      bolsas: itensPorContrato.get(c.CODIGOCONTRATO) ?? [],
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  private async instituicaoTemContratoBolsa(
    codigoInstituicao: number,
    codigoBolsas: number[],
    codigoContratoExcluir?: number,
  ): Promise<{ codigoBolsa: number; designacao: string }[]> {
    if (codigoBolsas.length === 0) return [];

    const placeholders = codigoBolsas.map((_, idx) => `:cod${idx}`).join(', ');
    const params: Record<string, any> = {};
    codigoBolsas.forEach((codigo, idx) => {
      params[`cod${idx}`] = codigo;
    });
    params['codigoInstituicao'] = codigoInstituicao;

    let condicaoExclusao = '';
    if (codigoContratoExcluir !== undefined) {
      condicaoExclusao = ' AND cb.CODIGO_CONTRATO != :codigoContratoExcluir';
      params['codigoContratoExcluir'] = codigoContratoExcluir;
    }

    const sql = `
    SELECT DISTINCT
      ci.CODIGO_BOLSA as CODIGO_BOLSA,
      b.DESIGNACAO    as DESIGNACAO
    FROM TB_CONTRATO_BOLSA cb
    INNER JOIN TB_CONTRATO_BOLSA_ITEM ci
        ON ci.CODIGO_CONTRATO = cb.CODIGO_CONTRATO
    INNER JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = cb.CODIGO_INSTITUICAO
    INNER JOIN FK2_TB_BOLSAS b
        ON b.CODIGO = ci.CODIGO_BOLSA
    WHERE cb.DELETED_AT is null
    AND ci.CODIGO_BOLSA in (${placeholders})
    AND cb.CODIGO_INSTITUICAO = :codigoInstituicao
    AND cb.DATA_FIM >= TRUNC(SYSDATE)
    ${condicaoExclusao}`;

    const rows = await this.dataSource.query(sql, params as any);

    return rows.map((row: any) => ({
      codigoBolsa: Number(row.CODIGO_BOLSA),
      designacao: row.DESIGNACAO,
    }));
  }

  private async obterItensPorContratos(
    codigosContrato: number[],
  ): Promise<Map<number, any[]>> {
    const mapa = new Map<number, any[]>();
    if (codigosContrato.length === 0) {
      return mapa;
    }

    const placeholders = codigosContrato
      .map((_, idx) => `:cod${idx}`)
      .join(', ');
    const params: Record<string, any> = {};
    codigosContrato.forEach((codigo, idx) => {
      params[`cod${idx}`] = codigo;
    });

    const sqlItens = `
      SELECT
        cbi.CODIGO                   as codigo,
        cbi.CODIGO_CONTRATO          as codigoContrato,
        cbi.CODIGO_BOLSA             as codigoBolsa,
        cbi.NUMERO_MAXIMO_ESTUDANTE  as numeroMaximoEstudante,
        bo.STATUS                    as status,
        bo.DESIGNACAO                as designacao,
        bo.CREATED_AT                as createdAt,
        bo.UPDATED_AT                as updatedAt,
        bo.VALOR_DESCONTO            as valorDesconto,
        cr.DESIGNACAO                as tipoCredito,
        db.DESIGNACAO                as tipoDesconto
      FROM TB_CONTRATO_BOLSA_ITEM cbi
      INNER JOIN FK2_TB_BOLSAS bo
        ON bo.CODIGO = cbi.CODIGO_BOLSA
      INNER JOIN FK2_TB_TIPO_CREDITO cr
        ON cr.CODIGO = bo.CODIGO_TIPO_CREDITO
      INNER JOIN FK2_TB_TIPO_DESCONTO_BOLSAS db
        ON db.CODIGO = bo.CODIGO_TIPO_DESCONTO
      WHERE cbi.CODIGO_CONTRATO IN (${placeholders})
    `;

    const itens = await this.dataSource.query(sqlItens, params as any);

    for (const item of itens) {
      const codigoContrato = item.CODIGOCONTRATO;
      const bolsa = {
        codigoItem: item.CODIGO,
        codigoBolsa: item.CODIGOBOLSA,
        numeroMaximoEstudante: item.NUMEROMAXIMOESTUDANTE,
        status: item.STATUS,
        designacao: item.DESIGNACAO,
        createdAt: item.CREATEDAT,
        updatedAt: item.UPDATEDAT,
        valorDesconto: item.VALORDESCONTO,
        tipoCredito: item.TIPOCREDITO,
        tipoDesconto: item.TIPODESCONTO,
      };
      if (!mapa.has(codigoContrato)) {
        mapa.set(codigoContrato, []);
      }
      mapa.get(codigoContrato)!.push(bolsa);
    }

    return mapa;
  }
}

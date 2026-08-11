import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateIsencaoDto } from './dto/create-isencao.dto';
import { UpdateIsencaoDto } from './dto/update-isencao.dto';
import { FilterIsencaoDto } from './dto/filter-isencao.dto';
import { PagedResult } from '../../common/dto/pagination-result.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateIsencaoMesalidadeDto } from './dto/create-isencao-mentalidade.dto';
import { InvoiceEnum } from 'src/common/enums/invoice.enum';
import { InvoiceItemEnum } from 'src/common/enums/invoice-item.enum';
import { CreateIsencaoMultaDTO } from './dto/create-isencao-multa.dto';

@Injectable()
export class IsencaoService {
  constructor(private readonly dataSource: DataSource) {}

  async create(createDto: CreateIsencaoDto) {
    const codigosMatriculas = createDto.codigoMatriculas;
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
        sysdate,
        :canal,
        :obs,
        'ACTIVO',
        :codigoAnoLectivo,
        :codigoPreInscricao,
        CURRENT_DATE
      )
    `;
    const sqlExisteIsencao = `
    select COUNT(*) AS TOTAL
    from FK2_TB_ISENCOES
    where 1=1
    and CODIGO_MATRICULA = :codigoMatricula
    and CODIGO_SERVICO = :codigoServico
    and UPPER(ESTADO_ISENSAO) = UPPER('Activo')
    `;
    const results = await Promise.all(
      codigosMatriculas.map(async (codigoMatricula) => {
        try {
          const existeIsencaoParams = {
            codigoMatricula: codigoMatricula,
            codigoServico: createDto.codigoServico,
          };
          const resultado = await this.dataSource.query(
            sqlExisteIsencao,
            Object.values(existeIsencaoParams),
          );
          const row = resultado?.[0];
          if (!row || row.TOTAL > 0) {
            throw new BadRequestException(
              'Já existe uma isenção ativa com essas mesmas informações',
            );
          }

          const params = {
            codigoMatricula: codigoMatricula,
            codigoServico: createDto.codigoServico,
            codigoUtilizador: createDto.codigoUtilizador || null,

            canal: createDto.canal || null,
            obs: createDto.obs || null,
            codigoAnoLectivo: createDto.codigoAnoLectivo,
            codigoPreInscricao: createDto.codigoPreInscricao || null,
          };

          await this.dataSource.query(sql, Object.values(params));
          return { codigoMatricula, success: true };
        } catch (e) {
          return { codigoMatricula, success: false, error: e?.message };
        }
      }),
    );
    const sucessos = results
      .filter((r) => r.success)
      .map((r) => r.codigoMatricula);

    const erros = results
      .filter((r) => !r.success)
      .map((r) => ({
        codigoMatricula: r.codigoMatricula,
        error: r.error,
      }));
    return {
      total: codigosMatriculas.length,
      sucessos,
      erros,
    };
  }

  async isentarMensalidade(createMensalidadeDto: CreateIsencaoMesalidadeDto) {
    const { codigoAnoLectivo, codigoMatricula, mesTemps } =
      createMensalidadeDto;

    const results: any[] = [];

    for (const mes of mesTemps) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 1. Verificar isenção existente
        const resultado = await queryRunner.query(
          `
        select COUNT(*) AS TOTAL
        from FK2_TB_ISENCOES
        where MES_TEMP_ID = :mesTempId
        and CODIGO_MATRICULA = :codigoMatricula
        and UPPER(ESTADO_ISENSAO) = 'ACTIVO'
        `,
          {
            codigoMatricula,
            mesTempId: mes.mesTempId,
          } as any,
        );

        const row = resultado?.[0];

        if (row && row.TOTAL > 0) {
          throw new Error(
            'Já existe uma isenção ativa com essas mesmas informações',
          );
        }

        // 2. Buscar factura
        const resultadoInforFacura = await queryRunner.query(
          `
        select
          fi.CODIGO,
          fi.CODIGOFACTURA,
          fi.TOTAL,
          f.estado AS ESTADO_FACTURA
        from FK2_FACTURA_ITEMS fi
        inner join fk2_factura f on f.codigo = fi.CODIGOFACTURA
        where fi.MES_TEMP_ID = :mesTempId
        and f.CODIGOMATRICULA = :codigoMatricula
        `,
          {
            mesTempId: mes.mesTempId,
            codigoMatricula,
          } as any,
        );

        const rowInfoFactura = resultadoInforFacura?.[0];

        if (rowInfoFactura?.ESTADO_FACTURA == InvoiceEnum.PAGO) {
          throw new Error('A Factura já está paga');
        }
        if (rowInfoFactura) {
          // 3. Atualizar item
          await queryRunner.query(
            `
        update fk2_factura_items
        set estado = :estado
        where codigo = :codigo
        `,
            {
              estado: InvoiceItemEnum.ISENTO,
              codigo: rowInfoFactura.CODIGO,
            } as any,
          );

          // 4. Verificar pendentes
          const resultadoContarPendentes = await queryRunner.query(
            `
        select count(*) as TOTAL
        from FK2_FACTURA_ITEMS
        where ESTADO = :estado
        and CODIGO <> :codigo
        and CODIGOFACTURA = :factura
        `,
            {
              estado: InvoiceEnum.PENDENTE,
              codigo: rowInfoFactura.CODIGO,
              factura: rowInfoFactura.CODIGOFACTURA,
            } as any,
          );

          let facturaStatus = InvoiceEnum.ISENTO;

          if (resultadoContarPendentes?.[0]?.TOTAL > 0) {
            facturaStatus = InvoiceEnum.PENDENTE;
          }

          // 5. Atualizar factura
          await queryRunner.query(
            `
        update fk2_factura
        set valorisento = :valor,
            estado = :estado
        where codigo = :codigo
        `,
            {
              valor: rowInfoFactura.TOTAL,
              estado: facturaStatus,
              codigo: rowInfoFactura.CODIGOFACTURA,
            } as any,
          );
        }
        // 6. Inserir isenção
        await queryRunner.query(
          `
        INSERT INTO FK2_TB_ISENCOES (
          CODIGO_MATRICULA,
          CODIGO_SERVICO,
          CODIGO_UTILIZADOR,
          DATA_ISENCAO,
          CANAL,
          OBS,
          ESTADO_ISENSAO,
          CODIGO_ANOLECTIVO,
          CODIGO_PREINSCRICAO,
          CREATED_AT,
          MES_TEMP_ID
        ) VALUES (
          :codigoMatricula,
          :codigoServico,
          :codigoUtilizador,
          sysdate,
          :canal,
          :obs,
          'ACTIVO',
          :codigoAnoLectivo,
          :codigoPreInscricao,
          CURRENT_DATE,
          :mesTempId
        )
        `,
          {
            codigoMatricula,
            codigoServico: mes.servicoId,
            codigoUtilizador: null,
            canal: createMensalidadeDto.canal ?? null,
            obs: createMensalidadeDto.obs ?? null,
            codigoAnoLectivo,
            codigoPreInscricao: createMensalidadeDto.obs ?? null,
            mesTempId: mes.mesTempId,
          } as any,
        );

        // commit desse item
        await queryRunner.commitTransaction();
        results.push({ mesTemp: mes.mesTempId, success: true });
      } catch (e: any) {
        // rollback só desse item
        await queryRunner.rollbackTransaction();
        results.push({
          mesTemp: mes.mesTempId,
          success: false,
          error: e.message,
        });
      } finally {
        await queryRunner.release();
      }
    }
    const sucessos = results.filter((r) => r.success).map((r) => r.mesTemp);
    const erros = results
      .filter((r) => !r.success)
      .map((r) => ({
        mesTempId: r.mesTemp,
        error: r.error,
      }));

    return {
      total: mesTemps.length,
      sucessos,
      erros,
    };
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

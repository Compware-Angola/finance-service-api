import { BadRequestException, Injectable, UseGuards } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { InvoiceEnum } from 'src/common/enums/invoice.enum';
import { CreateIsencaoMultaDTO } from './dto/create-isencao-multa.dto';
import { ReferenceStatusEnum } from 'src/common/enums/reference.status.enum';
import { ExemptionStatusMulta } from 'src/common/enums/exemption-status.enum';
import { RemoteJwtAuthGuard } from 'src/common/guard/remote.jwt-auth.guard';
import { PermissionsGuard } from 'src/common/secret/permissions.guard';
import { currentUsername } from '../util/current-user';
import { FindIsencaoMultaDTO } from './dto/find-isencao-muta.dto';

interface BuscarFacturaReturnDTO {
  codigo_factura: number;
  total: number;
  estado_factura: number;
}
interface InserirIsencaoMultaDTO {
  codigoMatricula: number;
  codigoAnoLectivo: number;
  codigoServico: number;
  mesTempId: number;
  canal: number | null;
  codigoUtilizador: number;
  codigoMotivo: number | null;
  obs: string | null;
}
interface BuscarFacturaItensDTO {
  multa: number;
  total: number;
  codigo: number;
}
interface BuscarFacturaDTO {
  valor_pagar: number;
  multa: number;
  total: number;
}
@Injectable()
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
export class IsencaoServiceMulta {
  constructor(private readonly dataSource: DataSource) {}
  private queryRunner!: QueryRunner;

  private async initQueryRunner() {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
  }

  async isentarMulta(dto: CreateIsencaoMultaDTO, userId: number) {
    const {
      codigoAnoLectivo,
      codigoMatricula,
      mesTemps,
      canal,
      codigoMotivo,
      obs,
    } = dto;

    const results: any[] = [];

    for (const mes of mesTemps) {
      try {
        await this.initQueryRunner();
        await this.queryRunner.startTransaction();
        // 1. Verificar isenção existente
        const resultado = await this.queryRunner.query(
          `
        select COUNT(*) AS TOTAL
        from FK2_TB_ISENCOE_MULTA
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

        if (!row || row.TOTAL > 0) {
          throw new Error(
            'Já existe uma isenção de multa ativa com essas mesmas informações',
          );
        }

        const rowInfoFactura = await this.buscarFacturaMensalidade(
          codigoMatricula,
          mes.mesTempId,
        );

        if (
          rowInfoFactura &&
          rowInfoFactura.estado_factura == InvoiceEnum.PAGO
        ) {
          throw new BadRequestException(
            'Não tem como isentar a multa de uma mensalidade já paga',
          );
        }
        //Aqui ele tira as multas de uma factura
        if (rowInfoFactura) {
          //Aqui ele retira a multa da factura
          await this.retirarMultaFactura(
            rowInfoFactura.codigo_factura,
            mes.mesTempId,
          );
          //Ele também deve  expirar qualquer referência já existente
          await this.expirarReferenciaFactura(rowInfoFactura.codigo_factura);
        }
        await this.inserirIsencaoMulta({
          canal: canal ?? null,
          codigoAnoLectivo: codigoAnoLectivo,
          codigoMatricula: codigoMatricula,
          codigoServico: mes.servicoId,
          codigoUtilizador: userId,
          mesTempId: mes.mesTempId,
          obs: obs ?? null,
          codigoMotivo: codigoMotivo ?? null,
        });
        results.push({
          mesTemp: mes.mesTempId,
          success: true,
        });
        await this.queryRunner.commitTransaction();
      } catch (e: any) {
        results.push({
          mesTemp: mes.mesTempId,
          success: false,
          error: e.message,
        });
        await this.queryRunner.rollbackTransaction();
      } finally {
        await this.queryRunner.release();
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

  private async buscarFacturaMensalidade(
    codigoMatricula: number,
    mesTempId: number,
  ): Promise<BuscarFacturaReturnDTO | undefined> {
    // 2. Buscar factura
    const resultadoInforFacura = await this.queryRunner.query(
      `SELECT
    fi.CODIGO        AS codigo,
    fi.CODIGOFACTURA AS codigo_factura,
    fi.TOTAL         AS total,
    f.ESTADO         AS estado_factura
    FROM fk2_factura_items fi
    INNER JOIN fk2_factura f
      ON f.codigo = fi.CODIGOFACTURA
    WHERE fi.MES_TEMP_ID = :mesTempId
    AND f.CODIGOMATRICULA = :codigoMatricula
    AND (f.TOTALMULTA > 0 OR fi.MULTA > 0)
        `,
      {
        mesTempId: mesTempId,
        codigoMatricula,
      } as any,
    );
    return toLowerCaseKeys(resultadoInforFacura?.[0]);
  }

  async findIsencaoMulta(dto: FindIsencaoMultaDTO) {
    const {
      mesTempId,
      anoLectivo,
      codigoMatricula,
      codigoCurso,
      faculdadeId,
      codigoServico,
      estadoIsencao,
      page = 1,
      limit = 25,
    } = dto;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    // obrigatórios
    if (mesTempId) {
      conditions.push(`i.MES_TEMP_ID = :mesTempId`);
      params.mesTempId = mesTempId;
    }

    if (anoLectivo) {
      conditions.push(`i.CODIGO_ANOLECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }
    // opcionais
    if (codigoMatricula) {
      conditions.push(`m.CODIGO = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }

    if (codigoCurso) {
      conditions.push(`c.CODIGO = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }

    if (faculdadeId) {
      conditions.push(`c.FACULDADE_ID = :faculdadeId`);
      params.faculdadeId = faculdadeId;
    }
    if (mesTempId) {
      conditions.push(`i.mes_temp_id = :mesTempId`);
      params.mesTempId = mesTempId;
    }
    if (codigoServico) {
      conditions.push(`s.codigo = :codigoServico`);
      params.codigoServico = codigoServico;
    }
    if (estadoIsencao) {
      conditions.push(`i.estado_isensao  = :estadoIsencao`);
      params.estadoIsencao = estadoIsencao;
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
    SELECT *
    FROM (
      SELECT
        m.CODIGO              AS codigo_matricula,
        p.NOME_COMPLETO       AS nome_completo,
        p.BILHETE_IDENTIDADE  AS bilhete,
        c.DESIGNACAO          AS curso,
        t.DESIGNACAO          AS candidatura,
        s.DESCRICAO           AS servico,
        i.ESTADO_ISENSAO      AS estado,
        l.DESIGNACAO          AS ano_lectivo,
        i.DATA_ISENCAO        AS data_isencao,
        tp.DESIGNACAO         AS mes_temp
      FROM FK2_TB_ISENCOE_MULTA i
      INNER JOIN FK2_TB_MATRICULAS m
        ON m.CODIGO = i.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO a
        ON a.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.CODIGO = a.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS c
        ON c.CODIGO = m.CODIGO_CURSO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA t
        ON t.ID = c.TIPO_CANDIDATURA
      INNER JOIN FK2_TB_TIPO_SERVICOS s
        ON s.CODIGO = i.CODIGO_SERVICO
      INNER JOIN FK2_TB_ANO_LECTIVO l
        ON l.CODIGO = i.CODIGO_ANOLECTIVO
      INNER JOIN FK2_MES_TEMP tp
        ON tp.ID = i.MES_TEMP_ID
      ${whereClause}
    )
    ORDER BY nome_completo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit + 1} ROWS ONLY
  `;

    const rows = await this.dataSource.query(sql, params);

    const hasNextPage = rows.length > limit;

    if (hasNextPage) {
      rows.pop();
    }

    return {
      data: await toLowerCaseKeys(rows),
      page,
      limit,
      hasNextPage,
    };
  }

  private async buscarFactura(
    codigoFactura: number,
  ): Promise<BuscarFacturaDTO> {
    const sql = `
      select
        totalpreco as total,
        totalmulta as multa,
        valorapagar as valor_pagar
      from fk2_factura
      where 1=1
      and codigo = :codigoFactura
    `;
    const result = await this.queryRunner.query(sql, {
      codigoFactura,
    } as any);

    if (!result || result.length == 0) {
      throw new BadRequestException('Factura não encontrado');
    }
    return toLowerCaseKeys(result?.[0]);
  }
  private async retirarMultaFactura(codigoFactura: number, mesTempId: number) {
    try {
      const sqlRetirarMultaFactura = `
    update fk2_factura
    set totalmulta = :multa,
        valorapagar = :valorPagar
    where codigo = :codigoFactura
    `;

      const sqlRetirarMultaFacturaItem = `
    update fk2_factura_items
    set multa = :multa,
        total = :novoTotal
    where codigo = :codigoFacturaItem
    `;
      const facturaItems = await this.buscarFacturaItens(
        codigoFactura,
        mesTempId,
      );
      const factura = await this.buscarFactura(codigoFactura);

      const facturaItemMulta = facturaItems?.multa ?? 0;
      const novoMulta = factura.multa - facturaItemMulta;
      const novoValorApagar = factura.valor_pagar - facturaItemMulta;
      if (
        novoMulta == undefined ||
        novoValorApagar == undefined ||
        novoValorApagar == 0
      ) {
        throw new BadRequestException('Erro ao calcular os valores da multa');
      }

      await this.queryRunner.query(sqlRetirarMultaFacturaItem, {
        novoTotal: facturaItems.total - facturaItemMulta,
        multa: 0,
        codigoFacturaItem: facturaItems.codigo,
      } as any);

      await this.queryRunner.query(sqlRetirarMultaFactura, {
        multa: novoMulta,
        valorPagar: novoValorApagar,
        codigoFactura: codigoFactura,
      } as any);
    } catch (error) {
      throw new BadRequestException(
        'Erro ao tentar retirar a multa de uma factura ',
      );
    }
  }
  private async buscarFacturaItens(
    codigoFactura: number,
    mesTempId: number,
  ): Promise<BuscarFacturaItensDTO> {
    const sql = `
    SELECT
      codigo,
      multa,
      total
    from fk2_factura_items
    where 1=1
    and codigofactura = :codigoFactura
    and mes_temp_id   = :mesTempId`;
    const result = await this.queryRunner.query(sql, {
      codigoFactura,
      mesTempId,
    } as any);
    if (!result || result.length == 0) {
      throw new BadRequestException('FacturaItem não encontrado');
    }
    return toLowerCaseKeys(result?.[0]);
  }
  private async expirarReferenciaFactura(codigoFactura: number) {
    //aqui não preciso verificar se a referência existe ou não, se existe vai actualizar e não o país tem dono
    const sql = `
      update
      fk2_pagamento_por_referencias
      set status_ = '${ReferenceStatusEnum.EXPIRADO}',
          end_date = sysdate,
          updated_at = sysdate
      where 1=1
      and status_ = '${ReferenceStatusEnum.PENDENTE}'
      and factura_codigo = :codigoFactura
    `;
    await this.queryRunner.query(sql, {
      codigoFactura,
    } as any);
  }
  private async inserirIsencaoMulta(dto: InserirIsencaoMultaDTO) {
    const {
      canal,
      codigoAnoLectivo,
      codigoMatricula,
      codigoUtilizador,
      mesTempId,
      codigoServico,
      obs,
      codigoMotivo,
    } = dto;
    const nomeUser = await currentUsername(codigoUtilizador, this.queryRunner);
    const refUser = {
      pk: codigoUtilizador,
      desc: nomeUser,
    };
    // 6. Inserir isenção
    await this.queryRunner.query(
      `
        insert into fk2_tb_isencoe_multa (
          codigo_matricula,
          codigo_servico,
          codigo_utilizador,
          mes_temp_id,
          data_isencao,
          canal,
          created_at,
          updated_at,
          obs,
          estado_isensao,
          codigo_anolectivo,
          codigo_motivo,
          ref_utilizado
        ) values (
          :codigoMatricula,
          :codigoServico,
          :codigoUtilizador,
          :mesTempId,
          sysdate,
          :canal,
          sysdate,
          sysdate,
          :obs,
          :estado_isensao,
          :codigoAnoLectivo,
          :codigoMotivo,
          :refUtilizador
        )
        `,
      {
        codigoMatricula,
        codigoServico: codigoServico,
        codigoUtilizador: codigoUtilizador,
        canal: canal ?? null,
        obs: obs ?? null,
        mesTempId: mesTempId,
        estado_isensao: ExemptionStatusMulta.Activo,
        codigoMotivo: codigoMotivo,
        codigoAnoLectivo: codigoAnoLectivo,
        refUtilizador: JSON.stringify(refUser),
      } as any,
    );
  }
}

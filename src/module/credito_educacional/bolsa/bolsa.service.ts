import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBolsaDto } from './dto/create-bolsa.dto';
import { UpdateBolsaDto } from './dto/update-bolsa.dto';

import { DataSource } from 'typeorm';
import { FindBolsaDto } from './dto/find-bolsa.dto';
import { toLowerCaseKeys } from 'src/module/util/toLowerCaseKeys';
import { FindBolsaDropdownDto } from './dto/find-bolsa-dropdown.dto';

@Injectable()
export class BolsaService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async create(createBolsaDto: CreateBolsaDto, codigoUtilizador: number) {
    const {
      designacao,
      codigoInstituicao,
      codigoTipoDesconto,
      valorDesconto,
      codigoTipoCredito,
    } = createBolsaDto;
    const checkBolsa = await this.dataSource.query(
      `
    SELECT 
      CODIGO
    FROM FK2_TB_BOLSAS
    WHERE UPPER(DESIGNACAO) = UPPER(:designacao)
    AND CODIGO_INSTITUICAO = :codigoInstituicao
    AND CODIGO_TIPO_CREDITO = :codigoTipoCredito
    AND CODIGO_TIPO_DESCONTO = :codigoTipoDesconto
    `, {
      designacao,
      codigoInstituicao,
      codigoTipoCredito,
      codigoTipoDesconto,
    } as any);
    if (checkBolsa.length > 0) {
      throw new BadRequestException('Bolsa ja existe');
    }
    // VERIFICAR SE O TIPO DE DESCONTO ÉPERCENTAGEM OU VALOR
    const checkTipoDesconto = await this.dataSource.query(
      `
    SELECT 
      CODIGO,
      SIGLA
    FROM FK2_TB_TIPO_DESCONTO_BOLSAS
    WHERE CODIGO = :codigoTipoDesconto
    `,
      {
        codigoTipoDesconto,
      } as any,
    );
    if (checkTipoDesconto[0].SIGLA === "DESC_PERC") {
      if (valorDesconto > 100) {
        throw new BadRequestException('O valor do desconto não pode exceder 100%');
      }
    } else if (checkTipoDesconto[0].SIGLA === "DESC_FIX") {
      if (valorDesconto < 1000) {
        throw new BadRequestException('O valor do desconto deve ser maior ou igual a 1000');
      }
    }

    await this.dataSource.query(
      `
    INSERT INTO FK2_TB_BOLSAS (
        DESIGNACAO,
        CODIGO_INSTITUICAO,
        CODIGO_TIPO_DESCONTO,
        VALOR_DESCONTO,
        CODIGO_TIPO_CREDITO,
        STATUS,
        CREATEDBY,
        UPDATEBY
    )
    VALUES (
        :designacao,
        :codigoInstituicao,
        :codigoTipoDesconto,
        :valorDesconto,
        :codigoTipoCredito,
        1,
        :createdBy,
        :updateBy
    )
    `,
      {
        designacao,
        codigoInstituicao,
        codigoTipoDesconto: codigoTipoDesconto ?? null,
        valorDesconto: valorDesconto ?? null,
        codigoTipoCredito: codigoTipoCredito ?? null,
        createdBy: codigoUtilizador,
        updateBy: codigoUtilizador
      } as any,
    );

    return {
      message: 'Bolsa criada com sucesso',
      statusCode: 201,
    };
  }

  async findAll(query: FindBolsaDto) {
    const {
      designacao,
      instituicao,
      codigoInstituicao,
      codigoTipoCredito,
      codigoTipoDesconto,
      page = 1,
      limit = 10,
    } = query;

    const offset = (page - 1) * limit;

    const params = {
      designacao: designacao ?? null,
      instituicao: instituicao ?? null,
      codigoInstituicao: codigoInstituicao ?? null,
      codigoTipoCredito: codigoTipoCredito ?? null,
      codigoTipoDesconto: codigoTipoDesconto ?? null,
    };

    const whereClause = `
      WHERE 1=1
      AND (:designacao IS NULL 
           OR UPPER(A.DESIGNACAO) LIKE '%' || UPPER(:designacao) || '%')
      AND (:instituicao IS NULL 
           OR UPPER(D.INSTITUICAO) LIKE '%' || UPPER(:instituicao) || '%')
      AND (:codigoInstituicao IS NULL 
           OR A.CODIGO_INSTITUICAO = :codigoInstituicao)
      AND (:codigoTipoCredito IS NULL 
           OR A.CODIGO_TIPO_CREDITO = :codigoTipoCredito)
      AND (:codigoTipoDesconto IS NULL 
           OR A.CODIGO_TIPO_DESCONTO = :codigoTipoDesconto)
    `;

    const [dataResutl, total] = await Promise.all([
      this.dataSource.query(
        `
        SELECT 
            A.CODIGO
          , A.DESIGNACAO
          , A.CODIGO_INSTITUICAO
          , D.INSTITUICAO                 AS INSTITUICAO
          , A.VALOR_DESCONTO
          , A.CODIGO_TIPO_DESCONTO
          , E.DESIGNACAO                  AS DESCRICAO_TIPO_DESCONTO
          , A.CODIGO_TIPO_CREDITO
          , F.DESIGNACAO                  AS DESCRICAO_TIPO_CREDITO
          , A.STATUS                      AS ESTADO
        FROM FK2_TB_BOLSAS A
        LEFT JOIN FK2_TB_INSTITUICAO D
               ON D.CODIGO = A.CODIGO_INSTITUICAO
        LEFT JOIN FK2_TB_TIPO_CREDITO F
               ON F.CODIGO = A.CODIGO_TIPO_CREDITO
        LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS E
               ON E.CODIGO = A.CODIGO_TIPO_DESCONTO
        ${whereClause}
        ORDER BY A.CODIGO DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as any,
      ),

      this.dataSource.query(
        `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_TB_BOLSAS A
        LEFT JOIN FK2_TB_INSTITUICAO D
               ON D.CODIGO = A.CODIGO_INSTITUICAO
        LEFT JOIN FK2_TB_TIPO_CREDITO F
               ON F.CODIGO = A.CODIGO_TIPO_CREDITO
        LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS E
               ON E.CODIGO = A.CODIGO_TIPO_DESCONTO
        ${whereClause}
        `,
        params as any,
      ),
    ]);

    const totalRecords = Number(total[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(dataResutl),
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }

  async update(id: number, updateBolsaDto: UpdateBolsaDto, codigoUtilizador: number) {
    const {
      designacao,
      codigoInstituicao,
      codigoTipoDesconto,
      valorDesconto,
      codigoTipoCredito
    } = updateBolsaDto;
    let checkTipoDesconto: any = null;
    if (codigoTipoDesconto !== null || codigoTipoDesconto !== undefined) {
      checkTipoDesconto = await this.dataSource.query(
        `
    SELECT 
      CODIGO,
      SIGLA
    FROM FK2_TB_TIPO_DESCONTO_BOLSAS
    WHERE CODIGO = :codigoTipoDesconto
    `,
        {
          codigoTipoDesconto,
        } as any,
      );
    }

    if (valorDesconto && codigoTipoDesconto && checkTipoDesconto) {
      if (checkTipoDesconto[0].SIGLA === "DESC_PERC") {
        if (valorDesconto > 100) {
          throw new BadRequestException('O valor do desconto não pode exceder 100%');
        }
      } else if (checkTipoDesconto[0].SIGLA === "DESC_FIX") {
        if (valorDesconto < 1000) {
          throw new BadRequestException('O valor do desconto deve ser maior ou igual a 1000');
        }
      }
    }

    await this.dataSource.query(
      `
    UPDATE FK2_TB_BOLSAS
    SET 
      DESIGNACAO = COALESCE(:designacao, DESIGNACAO),
      CODIGO_INSTITUICAO = COALESCE(:codigoInstituicao, CODIGO_INSTITUICAO),
      CODIGO_TIPO_DESCONTO = COALESCE(:codigoTipoDesconto, CODIGO_TIPO_DESCONTO),
      VALOR_DESCONTO = COALESCE(:valorDesconto, VALOR_DESCONTO),
      CODIGO_TIPO_CREDITO = COALESCE(:codigoTipoCredito, CODIGO_TIPO_CREDITO),
      UPDATEBY = :updateBy,
       UPDATED_AT = SYSDATE
    WHERE CODIGO = :codigo
    `,
      {
        codigo: id,
        designacao: designacao ?? null,
        codigoInstituicao: codigoInstituicao ?? null,
        codigoTipoDesconto: codigoTipoDesconto ?? null,
        valorDesconto: valorDesconto ?? null,
        codigoTipoCredito: codigoTipoCredito ?? null,
        updateBy: codigoUtilizador,
      } as any,
    );

    return {
      message: 'Bolsa atualizada com sucesso',
      statusCode: 200,
    };
  }

async findDropdown(query: FindBolsaDropdownDto) {
  const { designacao, codigoInstituicao } = query;

  const conditions: string[] = ['A.STATUS = 1'];
  const params: Record<string, any> = {};

  if (designacao?.trim()) {
    conditions.push(`
      UPPER(A.DESIGNACAO)
      LIKE '%' || UPPER(:designacao) || '%'
    `);

    params.designacao = designacao.trim();
  }

  if (codigoInstituicao) {
    conditions.push(
      'A.CODIGO_INSTITUICAO = :codigoInstituicao',
    );

    params.codigoInstituicao = codigoInstituicao;
  }

  const result = await this.dataSource.query(
    `
    SELECT
      A.CODIGO,
      A.DESIGNACAO
    FROM FK2_TB_BOLSAS A
    WHERE ${conditions.join('\nAND ')}
    ORDER BY A.DESIGNACAO
    `,
    params as any,
  );

  return toLowerCaseKeys(result);
}

  async switchStatus(id: number, utilizadorId: number) {
    const bolsa = await this.findOne(id);

    if (bolsa?.ESTADO === 1) {
      return await this.inativarBolsa(id, utilizadorId);
    } else {
      return await this.activeBolsa(id, utilizadorId);
    }
  }
  private async findOne(id: number) {
    const bolsa = await this.dataSource.query(
      `
    SELECT 
        A.CODIGO
      , A.DESIGNACAO
      , A.CODIGO_INSTITUICAO
      , D.INSTITUICAO                 AS INSTITUICAO
      , A.VALOR_DESCONTO
      , A.CODIGO_TIPO_DESCONTO
      , E.DESIGNACAO                  AS DESCRICAO_TIPO_DESCONTO
      , A.CODIGO_TIPO_CREDITO
      , F.DESIGNACAO                  AS DESCRICAO_TIPO_CREDITO
      , A.STATUS                      AS ESTADO
    FROM FK2_TB_BOLSAS A
    LEFT JOIN FK2_TB_INSTITUICAO D
           ON D.CODIGO = A.CODIGO_INSTITUICAO
    LEFT JOIN FK2_TB_TIPO_CREDITO F
           ON F.CODIGO = A.CODIGO_TIPO_CREDITO
    LEFT JOIN FK2_TB_TIPO_DESCONTO_BOLSAS E
           ON E.CODIGO = A.CODIGO_TIPO_DESCONTO
    WHERE A.CODIGO = :codigo
    `,
      {
        codigo: id,
      } as any,
    );

    if (!bolsa[0]) {
      throw new NotFoundException(`Bolsa com código ${id} não encontrada`);
    }

    return bolsa[0];
  }
  private async inativarBolsa(id: number, utilizadorId: number) {
    await this.dataSource.query(
      `
    UPDATE FK2_TB_BOLSAS
    SET 
      STATUS = 0,
      UPDATEBY = :updateBy,
      UPDATED_AT = SYSDATE
    WHERE CODIGO = :codigo
    `,
      {
        codigo: id,
        updateBy: utilizadorId,
      } as any,
    );

    return {
      message: 'Bolsa inativada com sucesso',
      statusCode: 200,
    };
  }

  private async activeBolsa(id: number, utilizadorId: number) {
    await this.dataSource.query(
      `
    UPDATE FK2_TB_BOLSAS
    SET 
      STATUS = 1,
      UPDATEBY = :updateBy,
      UPDATED_AT = SYSDATE
    WHERE CODIGO = :codigo
    `,
      {
        codigo: id,
        updateBy: utilizadorId,
      } as any,
    );

    return {
      message: 'Bolsa restaurada com sucesso',
      statusCode: 200,
    };
  }
}
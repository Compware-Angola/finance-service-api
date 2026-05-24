import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCreditoEducacionalDto } from './dto/create-credito_educacional.dto';

@Injectable()
export class CreditoEducacionalService {
  constructor(private readonly dataSource: DataSource) { }

  async create(dto: CreateCreditoEducacionalDto, codigoUtilizador: number) {
    // 1. Validação da Bolsa
    const bolsaExiste = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_BOLSAS WHERE CODIGO = :codigo`,
      [dto.codigoBolsa],
    );

    if (!bolsaExiste || bolsaExiste.length === 0) {
      throw new BadRequestException('codigoBolsa inválido');
    }

    // 2. INSERT - Versão corrigida e balanceada
    const sql = `
      BEGIN
        INSERT INTO FK2_TB_BOLSEIROS (
          CODIGO_MATRICULA,
          CODIGO_TIPO_BOLSA,
          DESCONTO,
          ISENTA_MULTA,
          CODIGO_UTILIZADOR,
          CANAL,
          CREATED_AT,
          UPDATED_AT,
          DATA_INICIO_BOLSA,
          DATA_FIM_BOLSA,
          CODIGO_INSTITUICAO,
          PAGAR_TAXAS_ADICIONAIS,
          CODIGO_ANOLECTIVO,
          AFECTACAO,
          OBSERVACAO,
          STATUS_,
          SEMESTRE,
          ESTADOBOLSA,
          TIPO_ALUNO_ID,
      
          CODIGO_TIPO_DESCONTONUMBER,
          CODIGO_TIPO_CREDITONUMBER,
          CODIGO_CREDITONUMBER,
          CODIGO_BOLSA
        )
        VALUES (
          :codigoMatricula,
          :codigoTipoBolsa,
          :desconto,
          :isentaMulta,
          :codigoUtilizador,
          :canal,
          TRUNC(SYSDATE),
          TRUNC(SYSDATE),
          :dataInicioBolsa,
          :dataFimBolsa,
          :codigoInstituicao,
          :pagarTaxasAdicionais,
          :codigoAnoLectivo,
          :afectacao,
          :observacao,
          :status,
          :semestre,
          :estadoBolsa,
          :tipoAlunoId,
       
          :codigoTipoDesconto,
          :codigoTipoCredito,
          :codigoCredito,
          :codigoBolsa
        );

        COMMIT;
      END;
    `;

    const params = [
      dto.codigoMatricula,
      dto.codigoTipoBolsa,
      dto.desconto,
      dto.isentaMulta,
      codigoUtilizador,
      dto.canal,
      dto.dataInicioBolsa,        // DATA_INICIO_BOLSA
      dto.dataFimBolsa,           // DATA_FIM_BOLSA
      dto.codigoInstituicao,
      dto.pagarTaxasAdicionais,
      dto.codigoAnoLectivo,
      dto.afectacao,
      dto.observacao,
      dto.status,
      dto.semestre,
      dto.estadoBolsa,
      dto.tipoAlunoId,

      dto.codigoTipoDesconto,
      dto.codigoTipoCredito,
      dto.codigoCredito,
      dto.codigoBolsa
    ];

    try {
      await this.dataSource.query(sql, params);

      return {
        statusCode: 201,
        message: 'Bolseiro criado com sucesso',
      };
    } catch (error: any) {
      console.error('Erro ao criar bolseiro:', error);
      throw new BadRequestException(`Erro ao registar bolseiro: ${error.message}`);
    }
  }
}
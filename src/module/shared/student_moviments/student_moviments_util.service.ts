import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateStudentMovimentDTO } from './dto/create-student-moviments.dto';
import { StudentMovimentOperationType } from 'src/enum/student-moviment-operation-type.enum';
import { AlunoService } from 'src/module/aluno/aluno.service';
import { StudentMovimentType } from 'src/enum/student-moviment-type.enum';

@Injectable()
export class StudentMovimentUtilService {
  constructor(
    private dataSource: DataSource,
    private alunoService: AlunoService,
  ) {}

  async registrarMovimento(
    dto: CreateStudentMovimentDTO,
    queryRunner?: QueryRunner,
  ) {
    const runner = queryRunner ?? this.dataSource;

    let credito = 0;
    let debito = 0;

    const saldoGeralAnteriores = await this.calcularSaldoGeralAnterior(
      dto.matricula,
      queryRunner,
    );
    const saldoOperacaoAnteriores = await this.calcularSaldoOperacaoAnteriores(
      dto.factura!,
      queryRunner,
    );
    const codigoTipoMovimento = await this.obterCodigoTipoMovimentoPorSigla(
      dto.siglaTipoMovimento,
    );

    let saldoGeral = saldoGeralAnteriores;
    let saldoOperacao = saldoOperacaoAnteriores;

    switch (dto.tipoOperacao) {
      case StudentMovimentOperationType.CREDIT:
        credito = dto.valor;
        saldoGeral += credito;
        saldoOperacao += credito;
        break;

      case StudentMovimentOperationType.DEBIT:
        debito = dto.valor;
        saldoGeral -= debito;
        saldoOperacao -= debito;
        break;
    }
    let valorExcedente = 0;
    if (dto.tipoOperacao === StudentMovimentOperationType.CREDIT) {
      if (dto.valorFactura != null) {
        valorExcedente = dto.valor - dto.valorFactura;
      } else {
        valorExcedente = Math.max(saldoOperacao, 0);
      }
      await this.cadastrarSaldoEstudante(
        valorExcedente,
        dto.matricula,
        queryRunner,
      );
    }

    await runner.query(
      `
      INSERT INTO FK2_HISTORICO_MOVIMENTO_CONTA_ESTUDANTE (
        REFERENCIA,
        DATA_MOVIMENTO,
        CREDITO,
        DEBITO,
        ESTADO,
        MATRICULA,
        SALDO_OPERACAO,
        SALDO_GERAL,
        CODIGOTIPOMOVIMENTO,
        CODIGOMOTIVO,
        CODIGOUTILIZADOR,
        OBSERVACAO,
        FACTURA,
        VALOR_EXCEDENTE
      ) VALUES (
        :referencia,
        SYSDATE,
        :credito,
        :debito,
        :estado,
        :matricula,
        :saldoOperacao,
        :saldoGeral,
        :codigoTipoMovimento,
        :codigoMotivo,
        :codigoUtilizador,
        :observacao,
        :factura,
        :valorExcedente
      )
      `,
      {
        referencia: dto.referencia,
        credito,
        debito,
        estado: 1,
        matricula: dto.matricula,
        saldoOperacao: Math.abs(saldoOperacao),
        saldoGeral,
        codigoTipoMovimento: codigoTipoMovimento,
        codigoMotivo: dto.codigoMotivo ?? null,
        codigoUtilizador: dto.codigoUtilizador ?? null,
        observacao: dto.observacao ?? null,
        factura: dto.factura,
        valorExcedente,
      } as any,
    );
    if (valorExcedente > 0) {
    }

    return {
      saldoGeral,
      saldoOperacao,
      creditoDisponivel: Math.max(saldoGeral, 0),
    };
  }
  async obterCodigoTipoMovimentoPorSigla(sigla: string) {
    const sql = `
      select
        designacao,
        codigo
      from fk2_tb_tipo_movimento where sigla = :sigla
    `;
    const result = await this.dataSource.query(sql, {
      sigla,
    } as any);
    return result?.[0]?.CODIGO ?? null;
  }
  async registrarRetiradaSaldoContaEstudante(
    codigoMatricula: number,
    valor: number,
    queryRunner?: QueryRunner,
  ) {
    const runner = queryRunner ?? this.dataSource;
    const saldoGeral = await this.calcularSaldoGeralAnterior(codigoMatricula);
    const codigoTipoMovimento = await this.obterCodigoTipoMovimentoPorSigla(
      StudentMovimentType.RSE,
    );
    await runner.query(
      `
      insert into fk2_historico_movimento_conta_estudante (
        referencia,
        data_movimento,
        credito,
        debito,
        estado,
        matricula,
        saldo_operacao,
        saldo_geral,
        codigotipomovimento,
        codigomotivo,
        codigoutilizador,
        observacao,
        factura,
        valor_excedente
      ) values (
        :referencia,
        sysdate,
        :credito,
        :debito,
        :estado,
        :matricula,
        :saldoOperacao,
        :saldoGeral,
        :codigoTipoMovimento,
        :codigoMotivo,
        :codigoUtilizador,
        :observacao,
        :factura,
        :valorExcedente
      )
      `,
      {
        referencia: null,
        credito: 0,
        debito: valor,
        estado: 1,
        matricula: codigoMatricula,
        saldoOperacao: 0,
        saldoGeral: saldoGeral - valor,
        codigoTipoMovimento: codigoTipoMovimento,
        codigoMotivo: null,
        codigoUtilizador: null,
        observacao: 'Retirada na conta do estudante',
        factura: null,
        valorExcedente: 0,
      } as any,
    );

    //Retirar o saldo no estudante
    const preInscricao =
      await this.alunoService.findAlunoPreinscricaoByMatricula(codigoMatricula);
    await runner.query(
      `
      update fk2_tb_preinscricao
      SET saldo_anterior = NVL(saldo, 0),
          saldo = NVL(saldo, 0) - :valor
      where codigo = :codigoPreinscricao
      `,
      {
        codigoPreinscricao: preInscricao.CODIGO,
        valor: valor,
      } as any,
    );
  }

  async obterCreditoDisponivel(
    codigoMatricula: number,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const saldoGeral = await this.calcularSaldoGeralAnterior(
      codigoMatricula,
      queryRunner,
    );
    return Math.max(saldoGeral, 0);
  }

  async calcularSaldoGeralAnterior(
    codigoMatricula: number,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const runner = queryRunner ?? this.dataSource;
    const sql = `
      SELECT
        NVL(SUM(CREDITO), 0) AS TOTAL_CREDITO,
        NVL(SUM(DEBITO), 0)  AS TOTAL_DEBITO
      FROM FK2_HISTORICO_MOVIMENTO_CONTA_ESTUDANTE
      WHERE MATRICULA = :codigoMatricula
    `;
    const resultado = await runner.query(sql, {
      codigoMatricula,
    } as any);

    const row = resultado[0] ?? {};
    return Number(row.TOTAL_CREDITO ?? 0) - Number(row.TOTAL_DEBITO ?? 0);
  }

  async calcularSaldoOperacaoAnteriores(
    codigoFactura: number,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const runner = queryRunner ?? this.dataSource;
    const sql = `
      SELECT
        NVL(SUM(CREDITO), 0) AS TOTAL_CREDITO,
        NVL(SUM(DEBITO), 0)  AS TOTAL_DEBITO
      FROM FK2_HISTORICO_MOVIMENTO_CONTA_ESTUDANTE
      WHERE FACTURA = :codigoFactura
    `;
    const resultado = await runner.query(sql, {
      codigoFactura,
    } as any);

    const row = resultado[0] ?? {};
    return Number(row.TOTAL_CREDITO ?? 0) - Number(row.TOTAL_DEBITO ?? 0);
  }
  async cadastrarSaldoEstudante(
    valorExcedente: number,
    codigoMatricula: number,
    queryRunner?: QueryRunner,
  ) {
    const runner = queryRunner ?? this.dataSource;
    const preInscricao =
      await this.alunoService.findAlunoPreinscricaoByMatricula(codigoMatricula);
    await runner.query(
      `
      update fk2_tb_preinscricao
      SET saldo_anterior = NVL(saldo, 0),
      saldo = NVL(saldo, 0) + :valorExcedente
      where codigo = :codigoPreinscricao
      `,
      {
        codigoPreinscricao: preInscricao.CODIGO,
        valorExcedente: valorExcedente,
      } as any,
    );
  }
}

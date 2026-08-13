import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { VoidPaymentDTO } from './dto/void-payment.dto';
import { CancellationType } from 'src/enum/cancellation-type.enum';

export enum PaymentStatus {
  CONCLUIDO = 'concluido',
  PENDENTE = 'pendente',
}

interface BuscarFatura {
  datafactura: string;
  totalpreco: number;
  totalmulta: number;
  valorapagar: number;
  valorentregue: number;
  ano_lectivo: string;
  estado: string;
  codigo: number;
}

interface BuscarFacturaItems {
  codigoproduto: string;
  codigofactura: string;
  quantidade: number;
  total: number;
  preco: number;
  multa: number;
  mes_temp_id: number;
  codigo_anolectivo: string;
  estado: string;
  valor_pago: number;
  data_limite: string;
  codigo: number;
  data_final: string;
}

interface BuscarPagamento {
  data: string;
  anolectivo: string;
  totalgeral: number;
  databanco: string;
  valor_depositado: number;
  estado: string;
  codigo_factura: number;
  codigo: number;
}

@Injectable()
export class VoidPaymentTaxService {
  constructor(private dataSource: DataSource) {}

  private async createQueryRunner(): Promise<QueryRunner> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    return qr;
  }
  async anularMulta(params: VoidPaymentDTO, userId: number): Promise<void> {
    const { codigoPagamento, motivo } = params;
    const qr = await this.createQueryRunner();

    await qr.startTransaction();
    try {
      const pagamento = await this.buscarPagamento(qr, codigoPagamento);

      const factura = await this.buscarFactura(qr, pagamento.codigo_factura);

      if (factura?.totalmulta === 0) {
        throw new BadRequestException('A factura não contém uma multa');
      }
      const novoValorApagar = factura.valorapagar - factura.totalmulta;
      const novoValorDepositado =
        pagamento.valor_depositado - factura.totalmulta;
      const multaAnulada = factura.totalmulta;

      await this.retirarMultaFacturaItens(qr, pagamento.codigo_factura);

      await qr.query(
        `
        UPDATE fk2_factura
        SET totalmulta = :totalMulta,
            valorapagar = :valorApagar
        WHERE codigo = :codigoFactura
        `,
        {
          totalMulta: 0,
          valorApagar: novoValorApagar,
          codigoFactura: pagamento.codigo_factura,
        } as any,
      );

      await qr.query(
        `
        UPDATE fk2_tb_pagamentos
        SET valor_depositado = :valorDepositado
        WHERE codigo = :codigoPagamento
        `,
        {
          codigoPagamento: pagamento.codigo,
          valorDepositado: novoValorDepositado,
        } as any,
      );

      await this.registarHistoricoAnulacao(qr, {
        codigoPagamento: pagamento.codigo,
        codigoOperador: userId,
        valor: multaAnulada,
        motivo,
      });

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  private async registarHistoricoAnulacao(
    qr: QueryRunner,
    params: {
      codigoPagamento: number;
      codigoOperador: number;
      valor: number;
      motivo: string;
    },
  ): Promise<void> {
    const { codigoPagamento, codigoOperador, valor, motivo } = params;
    await qr.query(
      `INSERT INTO fk2_tb_historico_anulacao_financeira
         (codigo_pagamento, codigo_operador, tipo_anulacao,
          valor, motivo, data_anulacao, created_at)
       VALUES
         (:codigoPagamento, :codigoOperador, :tipoAnulacao,
          :valor, :motivo, SYSDATE, SYSDATE)`,
      {
        codigoPagamento,
        codigoOperador,
        tipoAnulacao: CancellationType.MULTA,
        valor,
        motivo,
      } as any,
    );
  }

  private async buscarFacturaItems(
    qr: QueryRunner,
    codigoFactura: number,
  ): Promise<BuscarFacturaItems[]> {
    const result = await qr.query(
      `
      SELECT
        it.codigoproduto,
        it.codigofactura,
        it.quantidade,
        it.total,
        it.preco,
        it.multa,
        it.mes_temp_id,
        mt.data_limite,
        it.codigo_anolectivo,
        it.estado,
        it.valor_pago,
        it.codigo,
        mt.data_final
      FROM fk2_factura_items it
      INNER JOIN fk2_mes_temp mt ON mt.id = it.mes_temp_id
      WHERE codigofactura = :codigoFactura
      `,
      { codigoFactura } as any,
    );

    if (!result || result.length === 0) {
      throw new BadRequestException('Nenhum item de factura encontrado');
    }

    return toLowerCaseKeys(result);
  }

  private async retirarMultaFacturaItens(
    qr: QueryRunner,
    codigoFactura: number,
  ): Promise<void> {
    const facturaItens = await this.buscarFacturaItems(qr, codigoFactura);

    for (const item of facturaItens) {
      if (item.multa !== 0) {
        const novoTotal = item.total - item.multa;
        await qr.query(
          `
          UPDATE fk2_factura_items
          SET multa = :multa,
              total = :total
          WHERE codigo = :codigoFacturaItem
          `,
          {
            multa: 0,
            total: novoTotal,
            codigoFacturaItem: item.codigo,
          } as any,
        );
      }
    }
  }

  private async buscarPagamento(
    qr: QueryRunner,
    codigoPagamento: number,
  ): Promise<BuscarPagamento> {
    const result = await qr.query(
      `
      SELECT
        data,
        anolectivo,
        totalgeral,
        databanco,
        valor_depositado,
        estado,
        codigo_factura,
        codigo
      FROM fk2_tb_pagamentos
      WHERE codigo = :codigoPagamento
      `,
      { codigoPagamento } as any,
    );

    if (!result || result.length === 0) {
      throw new BadRequestException(
        'Nenhum pagamento encontrado para a factura',
      );
    }
    return toLowerCaseKeys(result[0]);
  }

  private async buscarFactura(
    qr: QueryRunner,
    codigoFactura: number,
  ): Promise<BuscarFatura> {
    const result = await qr.query(
      `
      SELECT
        datafactura,
        totalpreco,
        totalmulta,
        valorapagar,
        valorentregue,
        ano_lectivo,
        estado,
        codigo
      FROM fk2_factura
      WHERE codigo = :codigoFactura
      `,
      { codigoFactura } as any,
    );

    if (!result || result.length === 0) {
      throw new BadRequestException('Nenhuma factura encontrada');
    }

    return toLowerCaseKeys(result[0]);
  }
}

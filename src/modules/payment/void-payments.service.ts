import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { VoidPaymentDTO } from './dto/void-payment.dto';
import { CancellationType } from 'src/enum/cancellation-type.enum';

export enum PaymentStatus {
  CONCLUIDO = 'concluido',
  PENDENTE = 'pendente',
  ANULADO = 'anulado',
}

export interface BuscarPagamento {
  codigo_factura: number;
  valor: number;
  estado: string;
}

export interface AnularPagamentoDto {
  codigoPagamento: number;
  codigoOperador: number;
  tipoAnulacao: number;
  motivo: string;
}

@Injectable()
export class VoidPaymentService {
  constructor(private dataSource: DataSource) {}

  private async createRunner(): Promise<QueryRunner> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    return qr;
  }

  async anularPagamento(dto: VoidPaymentDTO, userId: number): Promise<void> {
    const { codigoPagamento, motivo } = dto;
    const qr = await this.createRunner();
    try {
      const pagamento = await this.buscarPagamento(qr, codigoPagamento);
      if (!pagamento) {
        throw new BadRequestException(
          `Pagamento ${codigoPagamento} não encontrado`,
        );
      }
      if (pagamento.estado == PaymentStatus.ANULADO) {
        throw new BadRequestException(
          `Pagamento ${codigoPagamento} já foi anulad`,
        );
      }
      await qr.query(
        `UPDATE fk2_tb_pagamentos
         SET    status_pagamento = 'anulado',
                estado = :status
         WHERE  codigo = :codigoPagamento`,
        { status: 3, codigoPagamento } as any,
      );

      await qr.query(
        `UPDATE fk2_factura
         SET    estado = :estado
         WHERE  codigo = :codigoFactura`,
        { estado: 3, codigoFactura: pagamento.codigo_factura } as any,
      );

      await qr.query(
        `UPDATE fk2_tb_controle_validacao_pagamentos
         SET    status_ = :estado
         WHERE  pagamento = :codigoPagamento`,
        { estado: 3, codigoPagamento } as any,
      );

      await qr.query(
        `UPDATE fk2_factura_items
         SET    estado = :estado
         WHERE  codigofactura = :codigoFactura`,
        { estado: 3, codigoFactura: pagamento.codigo_factura } as any,
      );
      await this.registarHistoricoAnulacao(qr, {
        codigoPagamento,
        codigoOperador: userId,
        valor: pagamento.valor,
        motivo,
      });

      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  async buscarPagamento(
    qr: QueryRunner,
    codigoPagamento: number,
  ): Promise<BuscarPagamento | undefined> {
    const result: BuscarPagamento[] = await qr.query(
      `SELECT codigo_factura,
              valor_depositado as  valor,
              status_pagamento as estado
       FROM   fk2_tb_pagamentos
       WHERE  codigo = :codigoPagamento`,
      { codigoPagamento } as any,
    );

    return toLowerCaseKeys(result?.[0]);
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
        tipoAnulacao: CancellationType.PAGAMENTO,
        valor,
        motivo,
      } as any,
    );
  }
}

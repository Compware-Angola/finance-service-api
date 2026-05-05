import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export enum PaymentStatus {
  CONCLUIDO = 'concluido',
  PENDENTE = 'pendente',
}
export interface BuscarPagamento {
  codigo_factura: number;
}

@Injectable()
export class PaymentService {
  constructor(private dataSource: DataSource) {}
  private queryRunner!: QueryRunner;

  private async initQueryRunner() {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
  }

  async anularPagamento(codigoPagamento: number) {
    await this.initQueryRunner();
    try {
      const pagamento = await this.buscarPagamento(codigoPagamento);
      if (!pagamento) {
        throw new BadRequestException('Erro ao buscar pagamento');
      }
      //Eliminar pagamento
      const sqlAnularPagamento = `
      update fk2_tb_pagamentos
      set status_pagamento = :status
      where 1=1
      and codigo = :codigoPagamento
    `;
      await this.queryRunner.query(sqlAnularPagamento, {
        status: 3,
        codigoPagamento,
      } as any);
      //Eliminar factura
      const anularFactura = `
    update fk2_factura
    set estado = :estado
    where 1=1
    and codigo = :codigoFactura
    `;
      await this.queryRunner.query(anularFactura, {
        estado: 3,
        codigoFactura: pagamento.codigo_factura,
      } as any);

      //Eliminar em controle validacao pagamentos
      const anularControlePagamento = `
    update fk2_tb_controle_validacao_pagamentos
    set status_ :estado
    where 1=1
    and pagamento = :codigoPagamento
    `;
      await this.queryRunner.query(anularControlePagamento, {
        codigoPagamento,
        estado: 3,
      } as any);

      //Eliminar factura items
      const anularFacturaItem = `
    update fk2_factura_items
    set estado = :estado
    where 1=1
    and codigofactura : codigoFactura
    `;
      await this.queryRunner.query(anularFacturaItem, {
        codigoFactura: pagamento.codigo_factura,
        estado: 3,
      } as any);
    } catch (error) {
      await this.queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await this.queryRunner.release();
    }
  }

  async buscarPagamento(
    codigoPagamento: number,
  ): Promise<BuscarPagamento | undefined> {
    const sql = `
    select
      codigo_factura
    from fk2_tb_pagamentos
    where 1=1
    and codigo = :codigoPagamento
    `;
    const result = this.queryRunner.query(sql, {
      codigoPagamento,
    } as any);
    return result?.[0];
  }
}

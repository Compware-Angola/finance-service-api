import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { obterMultaPorData } from '../util/obter-multa';

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
  codigo: string;
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
  codigo_factura: string;
  codigo: string;
}
@Injectable()
export class PaymentService {
  constructor(private dataSource: DataSource) { }
  private queryRunner!: QueryRunner;

  private async initQueryRunner() {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
  }
  private async anularPagamento(codigoFactura: number) {
    const pagamento = await this.buscarPagamento(codigoFactura);
    const factura = await this.buscarFactura(codigoFactura);
    const facturaItems = await this.buscarFacturaItems(codigoFactura);
    let totalMultaRetirar = 0;

    for (const facturaItem of facturaItems) {
      if (!facturaItem.data_limite || !pagamento.databanco) continue;
      const dataLimiteFactura = new Date(facturaItem.data_limite);
      const dataBanco = new Date(pagamento.databanco);
      if (dataBanco <= dataLimiteFactura) {
        const total = facturaItem.total - facturaItem.multa;
        await this.actualizarFacturaItem(
          facturaItem.codigo,
          total,
          facturaItem.multa,
        );
        totalMultaRetirar += facturaItem.multa;
      }
    }
    //Actualizar a factura
    const novoValorApagar = factura.valorapagar - totalMultaRetirar;
    const novaMulta = factura.totalmulta - totalMultaRetirar;
    const novoValorEntregue = factura.valorentregue - totalMultaRetirar;
    await this.queryRunner.query(
      `
      update fk2_factura
      set totalmulta = :novaMulta,
          valorapagar = :novoValorApagar,
          valorentregue = :novoValorEntregue
      where 1=1
      and codigo = :codigoFactura
    `,
      {
        codigoFactura: factura.codigo,
        novaMulta: novaMulta,
        novoValorEntregue: novoValorEntregue,
        novoValorApagar: novoValorApagar,
      } as any,
    );
    //Actualizar Pagamento
    await this.queryRunner.query(
      `
      update fk2_tb_pagamentos
      set totalgeral = :novoValorApagar,

      `,
    );
  }
  private async aplicarMultaFactura(
    facturaItem: BuscarFacturaItems,
    dataBanco: Date,
  ) {
    const dataFinal = new Date(facturaItem.data_final);
    const dataLimiteFactura = new Date(facturaItem.data_limite);
    const percentagemMulta = obterMultaPorData(
      dataBanco,
      dataLimiteFactura,
      dataFinal,
    );
    const valorSemMulta = facturaItem.total - facturaItem.multa;
    const novoValorMulta = valorSemMulta * percentagemMulta;
    if (facturaItem.multa > novoValorMulta) {
      const total = valorSemMulta + novoValorMulta;
      this.actualizarFacturaItem(facturaItem.codigo, total, novoValorMulta);
      //Retorna a Diferença simplesmente
      return facturaItem.multa - novoValorMulta;
    }
    return 0;
  }
  private async actualizarFacturaItem(
    codigoFacturaItem: number,
    total: number,
    multa: number,
  ) {
    await this.queryRunner.query(
      `
      update fk2_factura_items
      set total = :total,
          multa = :multa
      where 1=1
      and codigo = :codigoFacturaItem
    `,
      {
        total,
        multa,
        codigoFacturaItem,
      } as any,
    );
  }
  private async buscarFactura(codigoFactura: number): Promise<BuscarFatura> {
    const result = await this.queryRunner.query(
      `
    select
        datafactura,
        totalpreco,
        totalmulta,
        valorapagar,
        valorentregue,
        ano_lectivo,
        estado,
        codigo
      from fk2_factura
      where 1=1
      and codigo = :codigoFactura
      `,
      {
        codigoFactura,
      } as any,
    );

    if (!result || result.length == 0) {
      throw new BadRequestException('Nenhuma factura encontrada');
    }
    return result;
  }
  private async buscarFacturaItems(
    codigoFactura: number,
  ): Promise<BuscarFacturaItems[]> {
    const result = await this.queryRunner.query(
      `
      select
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
        mt.data_final
      from fk2_factura_items it
      inner join fk2_mes_temp mt
        on mt.id = it.mes_temp_id
      where 1=1
      and codigofactura = :codigoFactura
    `,
      {
        codigoFactura,
      } as any,
    );
    if (!result || result.length == 0) {
      throw new BadRequestException('Nenhuma factura encontrada');
    }
    return result;
  }
  private async buscarPagamento(
    codigoFactura: number,
  ): Promise<BuscarPagamento> {
    const result = await this.queryRunner.query(`
      select
        data,
        anolectivo,
        totalgeral,
        databanco,
        valor_depositado,
        estado,
        codigo_factura,
        codigo
      from fk2_tb_pagamentos
      where 1=1
      and codigo_factura = :codigoFactura
    `);
    if (!result || result.length == 0) {
      throw new BadRequestException('Nenhuma factura encontrada');
    }
    return result;
  }
}

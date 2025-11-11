import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Factura } from './factura.entity';
import { TbTipoServico } from './tb-tipo-servico.entity';

@Entity({ name: 'factura_items', "schema": 'DBUMA' })
export class FacturaItem {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'CodigoFactura' })
  CodigoFactura: number;

  @Column({ name: 'CodigoProduto' })
  CodigoProduto: number;

  @Column()
  preco: number;

  @Column()
  Multa: number;

  @Column({ name: 'descontoProduto' })
  descontoProduto: number;

  @Column()
  Total: number;

  @Column()
  incidencia: number;

  @Column({ name: 'valor_iva' })
  valor_iva: number;

  @Column({ name: 'taxa_iva' })
  taxa_iva: number;

  @ManyToOne(() => Factura, f => f.items)
  factura: Factura;

  @ManyToOne(() => TbTipoServico, ts => ts.itens)
  produto: TbTipoServico;
}
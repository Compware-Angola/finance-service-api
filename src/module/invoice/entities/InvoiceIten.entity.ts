import {
  Entity,
  PrimaryGeneratedColumn,
  Column,

} from 'typeorm';

@Entity('factura_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'CodigoProduto', type: 'int', unsigned: true, default: 0 })
  codigoProduto: number;

  @Column({ name: 'CodigoFactura', type: 'int', unsigned: true })
  codigoFactura: number;

  @Column({ name: 'Quantidade', type: 'double', nullable: true })
  quantidade?: number;

  @Column({ name: 'Total', type: 'double', nullable: true })
  total?: number;

  @Column({ name: 'OBS', type: 'varchar', length: 45, nullable: true })
  obs?: string;

  @Column({ name: 'taxa_iva', type: 'double', default: 0 })
  taxaIva: number;

  @Column({ name: 'valor_iva', type: 'double', default: 0 })
  valorIva: number;

  @Column({ name: 'preco', type: 'double', default: 0 })
  preco: number;

  @Column({ name: 'retencao', type: 'double', default: 0 })
  retencao: number;

  @Column({ name: 'incidencia', type: 'double', default: 0 })
  incidencia: number;

  @Column({ name: 'valor_desconto', type: 'double', default: 0 })
  valorDesconto: number;

  @Column({ name: 'descontoProduto', type: 'double', default: 0 })
  descontoProduto: number;

  @Column({ name: 'Mes', type: 'varchar', length: 45, nullable: true })
  mes?: string;

  @Column({ name: 'Multa', type: 'double', default: 0 })
  multa: number;

  @Column({ name: 'mes_temp_id', type: 'int', unsigned: true, nullable: true })
  mesTempId?: number;

  @Column({ name: 'codigo_anoLectivo', type: 'int', unsigned: true, nullable: true })
  codigoAnoLectivo?: number;

  @Column({ name: 'estado', type: 'int', default: 0 })
  estado: number;

  @Column({ name: 'valor_pago', type: 'double', default: 0 })
  valorPago: number;

  @Column({ name: 'valor_a_transportar', type: 'double', default: 0 })
  valorATransportar: number;

}

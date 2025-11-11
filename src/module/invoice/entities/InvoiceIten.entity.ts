import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity({ name: 'factura_items', "schema": 'DBUMA' })
export class InvoiceItem {
  @PrimaryGeneratedColumn({ name: 'codigo', "type": 'int' })
  codigo: number;

  @Column({ name: 'CodigoProduto', "type": 'int', "default": 0 })
  codigoProduto: number;

  @Column({ name: 'CodigoFactura', "type": 'int' })
  codigoFactura: number;

  // DOUBLE → NUMBER(15,2)
  @Column({ name: 'Quantidade', "type": 'number', "precision": 15, "scale": 2, "nullable": true })
  quantidade?: number;

  @Column({ name: 'Total', "type": 'number', "precision": 15, "scale": 2, "nullable": true })
  total?: number;

  @Column({ name: 'OBS', "type": 'varchar', "length": 45, "nullable": true })
  obs?: string;

  @Column({ name: 'taxa_iva', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  taxaIva: number;

  @Column({ name: 'valor_iva', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  valorIva: number;

  @Column({ name: 'preco', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  preco: number;

  @Column({ name: 'retencao', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  retencao: number;

  @Column({ name: 'incidencia', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  incidencia: number;

  @Column({ name: 'valor_desconto', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  valorDesconto: number;

  @Column({ name: 'descontoProduto', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  descontoProduto: number;

  @Column({ name: 'Mes', "type": 'varchar', "length": 45, "nullable": true })
  mes?: string;

  @Column({ name: 'Multa', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  multa: number;

  @Column({ name: 'mes_temp_id', "type": 'int', "nullable": true })
  mesTempId?: number;

  @Column({ name: 'codigo_anoLectivo', "type": 'int', "nullable": true })
  codigoAnoLectivo?: number;

  @Column({ name: 'estado', "type": 'int', "default": 0 })
  estado: number;

  @Column({ name: 'valor_pago', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  valorPago: number;

  @Column({ name: 'valor_a_transportar', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  valorATransportar: number;
}
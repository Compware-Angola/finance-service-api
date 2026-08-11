import { BaseEntity } from 'src/common/base-entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  PrimaryColumn,
} from 'typeorm';
@Entity({ name: 'UMA_FACTURA' })
export class Invoice extends BaseEntity {
  @PrimaryColumn({
    name: 'Codigo',
    type: 'number',
  })
  Codigo!: number; // ← ! para non-null
  @Column({ name: 'DataFactura', type: 'timestamp' })
  DataFactura!: Date;

  @Column({ name: 'TotalPreco', type: 'number', precision: 15, scale: 2 })
  TotalPreco!: number;

  @Column({ name: 'CodigoMatricula', type: 'int', nullable: true })
  CodigoMatricula!: number | null;

  @Column({ name: 'Referencia', type: 'varchar2', length: 20 })
  Referencia!: string;

  @Column({ name: 'Desconto', type: 'number', precision: 15, scale: 2 })
  Desconto!: number;

  @Column({
    name: 'Troco',
    type: 'number',
    precision: 15,
    scale: 2,
    insert: false,
  })
  Troco!: number;

  @Column({ name: 'totalIVA', type: 'number', precision: 15, scale: 2 })
  totalIVA!: number;

  @Column({ name: 'TotalMulta', type: 'number', precision: 15, scale: 2 })
  TotalMulta!: number;

  @Column({
    name: 'total_incidencia',
    type: 'number',
    precision: 15,
    scale: 2,
    insert: false,
  })
  totalIncidencia!: number;

  @Column({
    name: 'total_retencao',
    type: 'number',
    precision: 15,
    scale: 2,
    insert: false,
  })
  totalRetencao!: number;

  @Column({ name: 'ValorAPagar', type: 'number', precision: 15, scale: 2 })
  ValorAPagar!: number;

  @Column({
    name: 'ValorEntregue',
    type: 'number',
    precision: 15,
    scale: 2,
    insert: false,
  })
  ValorEntregue!: number;

  @Column({
    name: 'ValorAPagarExtenso',
    type: 'varchar2',
    length: 255,
    nullable: true,
  })
  ValorAPagarExtenso!: string | null;

  @Column({ name: 'Descricao', type: 'varchar2', length: 500, nullable: true })
  Descricao!: string | null;

  @Column({
    name: 'ValorEntregueMltCX',
    type: 'number',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  ValorEntregueMltCX!: number | null;

  @Column({ name: 'codigo_descricao', type: 'int' })
  codigoDescricao!: number;

  @Column({
    name: 'NextFactura',
    type: 'varchar2',
    length: 100,
    nullable: true,
  })
  NextFactura!: string | null;

  // AQUI ESTAVA O ERRO MORTAL
  @Column({ name: 'next', type: 'varchar2', length: 100, nullable: true })
  next!: string | null;

  @Column({ name: 'texto_hash', type: 'clob', nullable: true })
  textoHash!: string | null;

  @Column({ name: 'dataVencimento', type: 'date', nullable: true })
  dataVencimento!: Date | null;

  @Column({ name: 'polo_id', type: 'number' })
  poloId!: number;

  @Column({ name: 'obs', type: 'varchar2', length: 4000, nullable: true })
  obs!: string | null;

  @Column({ name: 'hashValor', type: 'varchar2', length: 500, nullable: true })
  hashValor!: string | null;

  @Column({
    name: 'contaCorrente',
    type: 'varchar2',
    length: 45,
    nullable: true,
  })
  contaCorrente!: string | null;

  @Column({
    name: 'faturaReference',
    type: 'varchar2',
    length: 45,
    nullable: true,
  })
  faturaReference!: string | null;

  @Column({ name: 'canal', type: 'int' })
  canal!: number;

  @Column({ name: 'ano_lectivo', type: 'int' })
  anoLectivo!: number;

  @Column({ name: 'estado', type: 'int' })
  estado!: number;

  @Column({ name: 'corrente', type: 'int' })
  corrente!: number;

  @Column({ name: 'codigo_preinscricao', type: 'int', nullable: true })
  codigoPreinscricao!: number | null;

  @Column({ name: 'numSequenciaFactura', type: 'int', nullable: true })
  numSequenciaFactura!: number | null;

  @Column({ name: 'tipo_documento_factura_id', type: 'int' })
  tipoDocumentoFacturaId!: number;

  @Column({ name: 'valor_isento', type: 'number', precision: 15, scale: 2 })
  valorIsento!: number;
}

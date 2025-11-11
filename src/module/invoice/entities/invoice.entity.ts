import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'factura', "schema": 'DBUMA' })
export class Invoice {
  @PrimaryGeneratedColumn({ name: 'Codigo', "type": 'int' })
  Codigo: number;

  // DATETIME → TIMESTAMP (Oracle)
  @Column({ name: 'DataFactura', "type": 'timestamp' })
  DataFactura: Date;

  // DOUBLE → NUMBER(15,2)
  @Column({ name: 'TotalPreco', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  TotalPreco: number;

  @Column({ name: 'CodigoMatricula', "type": 'int', "nullable": true })
  CodigoMatricula: number | null;

  @Column({ name: 'Referencia', "type": 'varchar', "length": 9, "default": '000000000' })
  Referencia: string;

  @Column({ name: 'Desconto', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  Desconto: number;

  @Column({ name: 'Troco', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  Troco: number;

  @Column({ name: 'totalIVA', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  totalIVA: number;

  @Column({ name: 'TotalMulta', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  TotalMulta: number;

  @Column({ name: 'total_incidencia', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  totalIncidencia: number;

  @Column({ name: 'total_retencao', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  totalRetencao: number;

  @Column({ name: 'ValorAPagar', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  ValorAPagar: number;

  @Column({ name: 'ValorEntregue', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  ValorEntregue: number;

  // VARCHAR 255 sem collation
  @Column({ name: 'ValorAPagarExtenso', "type": 'varchar', "length": 255, "default": '0', "nullable": true })
  ValorAPagarExtenso: string | null;

  @Column({ name: 'Descricao', "type": 'varchar', "length": 500, "nullable": true })
  Descricao: string | null;

  @Column({ name: 'ValorEntregueMltCX', "type": 'number', "precision": 15, "scale": 2, "default": 0, "nullable": true })
  ValorEntregueMltCX: number | null;

  @Column({ name: 'codigo_descricao', "type": 'int', "nullable": true })
  codigoDescricao: number | null;

  @Column({ name: 'NextFactura', "type": 'varchar', "length": 45, "default": '' })
  NextFactura: string;

  @Column({ name: 'next', "type": 'varchar', "length": 45, "default": '' })
  next: string;

  // LONGTEXT → CLOB (Oracle)
  @Column({ name: 'texto_hash', "type": 'clob', "nullable": true })
  textoHash: string | null;

  // DATE (só data) → mantido
  @Column({ name: 'dataVencimento', "type": 'date', "nullable": true })
  dataVencimento: Date | null;

@Column({ name: 'polo_id', "type": 'number', "precision": 19, "scale": 0 })
poloId: number;

  @Column({ name: 'obs', "type": 'varchar', "length": 45000, "nullable": true })
  obs: string | null;

  // VARCHAR sem collation
  @Column({ name: 'hashValor', "type": 'varchar', "length": 255, "nullable": true })
  hashValor: string | null;

  @Column({ name: 'contaCorrente', "type": 'varchar', "length": 45, "nullable": true })
  contaCorrente: string | null;

  @Column({ name: 'faturaReference', "type": 'varchar', "length": 45, "nullable": true })
  faturaReference: string | null;

  @Column({ name: 'canal', "type": 'int', "default": 3 })
  canal: number;

  @Column({ name: 'ano_lectivo', "type": 'int', "default": 1 })
  anoLectivo: number;

  @Column({ name: 'estado', "type": 'int', "default": 0, "comment": '1-Validado, 2-Pendente(pag parcial), 3-anulada' })
  estado: number;

  @Column({ name: 'corrente', "type": 'int', "default": 1 })
  corrente: number;

  @Column({ name: 'codigo_preinscricao', "type": 'int', "nullable": true })
  codigoPreinscricao: number | null;

  @Column({ name: 'numSequenciaFactura', "type": 'int', "nullable": true })
  numSequenciaFactura: number | null;

  @Column({ name: 'tipo_documento_factura_id', "type": 'int', "nullable": true })
  tipoDocumentoFacturaId: number | null;
}
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tipo_documentos_faturacao', schema: 'DBUMA' })
export class TypeInvoiceDocument {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'designacao', type: 'varchar', length: 45, charset: 'latin1', collation: 'latin1_swedish_ci' })
  designacao: string;

  @Column({ name: 'sigla', type: 'varchar', length: 45, charset: 'latin1', collation: 'latin1_swedish_ci' })
  sigla: string;
}

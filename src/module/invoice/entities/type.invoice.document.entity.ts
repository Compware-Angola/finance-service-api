import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TIPO_DOCUMENTOS_FATURACAO', })
export class TypeInvoiceDocument {
  @PrimaryGeneratedColumn({ name: 'id', "type": 'int', "unsigned": true })
  id: number;

  @Column({ name: 'designacao', "type": 'varchar', "length": 45, "charset": 'latin1', "collation": 'latin1_swedish_ci' })
  designacao: string;

  @Column({ name: 'sigla', "type": 'varchar', "length": 45, "charset": 'latin1', "collation": 'latin1_swedish_ci' })
  sigla: string;
}

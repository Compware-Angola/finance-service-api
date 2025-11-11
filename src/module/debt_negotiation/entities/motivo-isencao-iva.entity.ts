import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'motivos_isencao_iva', schema: 'DBUMA' })
export class MotivoIsencaoIva {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column()
  descricao: string;
}
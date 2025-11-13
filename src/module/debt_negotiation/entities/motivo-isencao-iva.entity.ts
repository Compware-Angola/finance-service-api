import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_MOTIVOS_ISENCAO_IVA', "schema": 'DBUMA' })
export class MotivoIsencaoIva {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column()
  descricao: string;
}
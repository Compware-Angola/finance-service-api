import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TIPO_TAXAS', "schema": 'DBUMA' })
export class TipoTaxa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  descricao: string;
}
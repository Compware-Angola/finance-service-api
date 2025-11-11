import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tipo_taxas', "schema": 'DBUMA' })
export class TipoTaxa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  descricao: string;
}
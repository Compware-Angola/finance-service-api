import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_taxas')
export class TipoTaxa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  descricao: string;
}
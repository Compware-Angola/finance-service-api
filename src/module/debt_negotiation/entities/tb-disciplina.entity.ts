import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tb_disciplinas', "schema": 'DBUMA' })
export class TbDisciplina {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
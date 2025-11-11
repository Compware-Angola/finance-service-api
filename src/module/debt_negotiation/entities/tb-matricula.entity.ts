import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tb_matriculas', "schema": 'DBUMA' })
export class TbMatricula {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Aluno' })
  Codigo_Aluno: number;

  @Column()
  estado_matricula: string;
}
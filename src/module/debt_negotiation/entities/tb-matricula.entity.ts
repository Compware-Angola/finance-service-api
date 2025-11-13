import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TB_MATRICULAS', "schema": 'DBUMA' })
export class TbMatricula {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Aluno' })
  Codigo_Aluno: number;

  @Column()
  estado_matricula: string;
}
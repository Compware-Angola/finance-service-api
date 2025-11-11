import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tb_cursos', "schema": 'DBUMA' })
export class TbCurso {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
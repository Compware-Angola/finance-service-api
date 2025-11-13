import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TB_CURSOS', "schema": 'DBUMA' })
export class TbCurso {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_cursos')
export class TbCurso {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
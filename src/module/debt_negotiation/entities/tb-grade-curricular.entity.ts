import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { TbDisciplina } from './tb-disciplina.entity';
@Entity({ name: 'tb_grade_curricular', schema: 'DBUMA' })
export class TbGradeCurricular {
  @PrimaryGeneratedColumn()
  Codigo: string;

  @Column({ name: 'Codigo_Disciplina' })
  Codigo_Disciplina: number;

  @ManyToOne(() => TbDisciplina)
  disciplina: TbDisciplina;
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

import { TbDisciplina } from './tb-disciplina.entity';
@Entity('tb_grade_curricular')
export class TbGradeCurricular {
  @PrimaryGeneratedColumn()
  Codigo: string;

  @Column({ name: 'Codigo_Disciplina' })
  Codigo_Disciplina: number;

  @ManyToOne(() => TbDisciplina)
  disciplina: TbDisciplina;
}
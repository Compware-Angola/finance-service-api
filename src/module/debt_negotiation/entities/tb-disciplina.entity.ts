import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_disciplinas')
export class TbDisciplina {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
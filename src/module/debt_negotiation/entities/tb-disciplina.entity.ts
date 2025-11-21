import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TB_DISCIPLINAS', })
export class TbDisciplina {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;
}
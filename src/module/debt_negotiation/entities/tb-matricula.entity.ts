import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_matriculas')
export class TbMatricula {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Aluno' })
  Codigo_Aluno: number;

  @Column()
  estado_matricula: string;
}
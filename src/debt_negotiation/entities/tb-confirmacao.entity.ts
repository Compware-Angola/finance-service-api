import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_confirmacoes')
export class TbConfirmacao {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Matricula' })
  Codigo_Matricula: number;

  @Column({ name: 'Codigo_Ano_lectivo' })
  Codigo_Ano_lectivo: number;
}
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tb_confirmacoes', schema: 'DBUMA' })
export class TbConfirmacao {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Matricula' })
  Codigo_Matricula: number;

  @Column({ name: 'Codigo_Ano_lectivo' })
  Codigo_Ano_lectivo: number;
}
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_MES_TEMP', "schema": 'DBUMA' })
export class MesTemp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  designacao: string;

  @Column()
  semestre: number;

  @Column()
  activo: number;

  @Column({ name: 'activo_posgraduacao' })
  activo_posgraduacao: number;

  @Column({ name: 'data_final' })
  data_final: string;

  @Column()
  prestacao: string;
  @Column()
  data_limite: string;

  @Column()
  ano_lectivo: number;
  @Column()
  isencao: number;
}
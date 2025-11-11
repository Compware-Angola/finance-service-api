import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: 'mes_temp', "schema": 'DBUMA' })
export class MesTemp {
  @PrimaryGeneratedColumn({ type: 'int', "unsigned": true })
  id: number;

  @Column({ type: 'varchar', "length": 45 })
  designacao: string;

  @Column({ type: 'int', "width": 1, "default": 1 })
  isencao: number;

  @Column({ type: 'int', "nullable": true })
  ordem_mes: number;

  @Column({ type: 'int', "unsigned": true, "default": 1 })
  ano_lectivo: number;

  @Column({ type: 'int', "nullable": true })
  prestacao: number;

  @Column({ type: 'int', "default": 1 })
  activo: number;

  @Column({ type: 'int', "default": 1 })
  activo_posgraduacao: number;

  @Column({ type: 'date', "nullable": true })
  data_limite: Date;

  @Column({ type: 'date', "nullable": true })
  data_inicial: Date;

  @Column({ type: 'date', "nullable": true })
  data_final: Date;

  @Column({ type: 'date', "nullable": true })
  data_final_desconto: Date;

  @Column({ type: 'int', "unsigned": true, "nullable": true })
  semestre: number;

  @Column({ type: 'int', "unsigned": true, "nullable": true })
  semestre_posgraduacao: number;


}

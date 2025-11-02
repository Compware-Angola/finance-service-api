// src/parametro/entities/parametro.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('tb_parametros')
@Index('CodigoEmpresa20', ['CodigoEmpresa'])
export class Parametro {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  Codigo: number;

  @Column({
    type: 'varchar',
    length: 545,
    nullable: true,
    charset: 'utf8mb3',
  })
  Designacao: string | null;

  @Column({ type: 'float', nullable: true })
  Valor: number | null;

  @Column({
    type: 'varchar',
    length: 145,
    nullable: true,
    charset: 'utf8mb3',
  })
  Descricao: string | null;

  @Column({
    type: 'int',
    unsigned: true,
    nullable: false,
    default: 1,
  })
  CodigoEmpresa: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  Num_max_faltas: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  Num_meses_atraso: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  control_ip: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true, charset: 'utf8mb3' })
  ip_interno: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, charset: 'utf8mb3' })
  ip_externo: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, charset: 'utf8mb3' })
  polo_marc_assuididade: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, charset: 'utf8mb3' })
  turno_marc_assuididade: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({ type: 'int', default: 0 })
  estado: number;


}
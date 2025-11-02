// src/mes-calendario/entities/mes-calendario.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('meses_calendario')
export class MesCalendario {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    charset: 'utf8mb3',
    collation: 'utf8mb3_general_ci',
  })
  designacao: string | null;
}
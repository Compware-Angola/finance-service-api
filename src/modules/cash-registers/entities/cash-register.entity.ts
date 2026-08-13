import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('FK2_TB_CAIXAS')
export class CashRegister {
  @PrimaryGeneratedColumn({
    name: 'CODIGO',
  })
  id: number;

  @Column({
    name: 'NOME',
  })
  name: string;

  @Column({
    name: 'CODE',
    nullable: true,
  })
  code?: string;

  @Column({
    name: 'STATUS_',
    default: 'fechado',
  })
  status: 'aberto' | 'fechado';

  @Column({
    name: 'BLOQUEIO',
    default: 'N',
  })
  blocked: 'S' | 'N';

  @Column({
    name: 'OPERADOR_ID',
    nullable: true,
  })
  operatorId: number;

  @Column({
    name: 'CREATED_BY',
    nullable: true,
  })
  createdBy?: number;

  @Column({
    name: 'UPDATED_BY',
    nullable: true,
  })
  updatedBy?: number;

  @Column({
    name: 'DELETED_BY',
    nullable: true,
  })
  deletedBy?: number;

  @CreateDateColumn({
    name: 'CREATED_AT',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'UPDATED_AT',
  })
  updatedAt: Date;

  @Column({
    name: 'DELETED_AT',
    nullable: true,
  })
  deletedAt?: Date;
}

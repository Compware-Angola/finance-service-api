import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('FK2_TB_MOVIMENTOS_CAIXAS')
export class CashRegisterMovement {
  @PrimaryGeneratedColumn({
    name: 'CODIGO',
  })
  id: number;

  @Column({
    name: 'CAIXA_ID',
    nullable: true,
  })
  cashRegisterId?: number;

  @Column({
    name: 'OPERADOR_ID',
    nullable: true,
  })
  operatorId?: number;

  @Column({
    name: 'OPERADOR_ADMIN_ID',
    nullable: true,
  })
  adminOperatorId?: number;

  @Column({
    name: 'VALOR_ABERTURA',
    type: 'number',
    nullable: true,
    default: 0,
  })
  openingAmount?: number;

  @Column({
    name: 'VALOR_ARRECADADO_TOTAL',
    type: 'number',
    nullable: true,
    default: 0,
  })
  totalCollectedAmount?: number;

  @Column({
    name: 'VALOR_ARRECADADO_DEPOSITOS',
    type: 'number',
    nullable: true,
    default: 0,
  })
  collectedDepositAmount?: number;

  @Column({
    name: 'VALOR_ARRECADADO_TPA',
    type: 'number',
    nullable: true,
    default: 0,
  })
  collectedTpaAmount?: number;

  @Column({
    name: 'VALOR_ARRECADADO_PAGAMENTO',
    type: 'number',
    nullable: true,
    default: 0,
  })
  collectedPaymentAmount?: number;

  @Column({
    name: 'VALOR_FACTURADO_PAGAMENTO',
    type: 'number',
    nullable: true,
    default: 0,
  })
  invoicedPaymentAmount?: number;

  @Column({
    name: 'STATUS_',
    nullable: true,
  })
  status?: string;

  @Column({
    name: 'STATUS_FINAL',
    nullable: true,
  })
  finalStatus?: string;

  @Column({
    name: 'STATUS_ADMIN',
    nullable: true,
  })
  adminStatus?: string;

  @Column({
    name: 'OBSERVACAO',
    type: 'clob',
    nullable: true,
  })
  observation?: string;

  @Column({
    name: 'MOTIVO_REJEICAO',
    type: 'clob',
    nullable: true,
  })
  rejectionReason?: string;

  @Column({
    name: 'DATA_AT',
    type: 'date',
    nullable: true,
  })
  dateAt?: Date;

  @Column({
    name: 'HORA_INICIO',
    type: 'varchar2',
    length: 8,
    nullable: true,
  })
  startTime?: string;

  @Column({
    name: 'DATA_FECHO',
    type: 'date',
    nullable: true,
  })
  closingDate?: Date;

  @Column({
    name: 'HORA_FECHO',
    type: 'varchar2',
    length: 8,
    nullable: true,
  })
  closingTime?: string;

  @Column({
    name: 'DATA_VALIDACAO',
    type: 'date',
    nullable: true,
  })
  validationDate?: Date;

  @Column({
    name: 'HORA_VALIDACAO',
    type: 'varchar2',
    length: 8,
    nullable: true,
  })
  validationTime?: string;

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

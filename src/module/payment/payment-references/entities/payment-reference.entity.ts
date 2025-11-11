import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'pagamento_por_referencias', "schema": 'DBUMA' })
export class PaymentReferences {
  // BIGINT → NUMBER(19,0)
  @PrimaryGeneratedColumn({ type: 'number', "name":'id'})
  id: number;

  // BIGINT → NUMBER(19,0)
  @Column({
    name: 'PAYMENT_ID',
    type: 'number',
    precision: 19,
    scale: 0,
    nullable: true,
    comment: 'Id do pagamento no BE',
  })
  paymentId?: number;

  @Column({
    name: 'SOURCE_ID',
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
    comment: 'Representa o código da factura no Mutue',
  })
  sourceId: string;

  @Column({
    name: 'factura_codigo',
    type: 'int',
    nullable: false,
    comment: 'Código da Factura do Mutue',
  })
  facturaCodigo: number;

  @Column({
    name: 'ENTITY_ID',
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Identificador da UMA no BE (número informado nos ATM’s ou Express)',
  })
  entityId: string;

  @Column({
    name: 'REFERENCE',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
    comment: 'Referência do pagamento',
  })
  reference: string;

  @Column({
    name: 'REFERENCE_ID',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  referenceId?: string;

  @Column({
    name: 'MERCHANT_TRANSACTION_ID',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  merchantTransactionId?: string;

  // DOUBLE → NUMBER(15,2)
  @Column({
    name: 'AMOUNT',
    type: 'number',
    precision: 15,
    scale: 2,
    nullable: false,
    comment: 'Valor a pagar da Factura',
  })
  amount: number;

  // DATETIME → TIMESTAMP
  @Column({
    name: 'START_DATE',
    type: 'timestamp',
    nullable: false,
    comment: 'Data que se gerou a referência',
  })
  startDate: Date;

  @Column({
    name: 'END_DATE',
    type: 'timestamp',
    nullable: false,
    comment: 'Data em que a referência vai expirar',
  })
  endDate: Date;

  @Column({
    name: 'Status',
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Estado da referência (ACTIVE, INACTIVE, CANCELED, PAID, ERROR)',
  })
  status: string;

  // TEXT → CLOB
  @Column({
    name: 'webhook',
    type: 'clob',
    nullable: true,
    comment: 'Payload do Webhook recebido (quando aplicável)',
  })
  webhook?: string;

  // CreateDateColumn simplificado (TypeORM usa TIMESTAMP automaticamente no Oracle)
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  // UpdateDateColumn simplificado
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
  })
  updatedAt: Date;
}
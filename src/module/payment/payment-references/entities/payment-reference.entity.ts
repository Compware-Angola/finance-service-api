// payment-references.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'UMA_PAGAMENTO_POR_REFERENCIAS', })
export class PaymentReferences extends BaseEntity {
  @PrimaryColumn({ name: 'id', type: 'number',  })  
  id: number;

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
    type: 'varchar2',
    length: 50,
    nullable: false,
    unique: true,
    comment: 'Representa o código da factura no Mutue',
  })
  sourceId: string;

  @Column({
    name: 'factura_codigo',
    type: 'number',
    nullable: false,
    comment: 'Código da Factura do Mutue',
  })
  facturaCodigo: number;

  @Column({
    name: 'ENTITY_ID',
    type: 'varchar2',
    length: 50,
    nullable: false,
    comment: 'Identificador da UMA no BE (número informado nos ATM’s ou Express)',
  })
  entityId: string;

  @Column({
    name: 'REFERENCE',
    type: 'varchar2',
    length: 100,
    nullable: false,
    unique: true,
    comment: 'Referência do pagamento',
  })
  reference: string;

  @Column({
    name: 'REFERENCE_ID',
    type: 'varchar2',
    length: 250,
    nullable: true,
  })
  referenceId?: string;

  @Column({
    name: 'MERCHANT_TRANSACTION_ID',
    type: 'varchar2',
    length: 250,
    nullable: true,
  })
  merchantTransactionId?: string;

  @Column({
    name: 'AMOUNT',
    type: 'number',
    precision: 15,
    scale: 2,
    nullable: false,
    comment: 'Valor a pagar da Factura',
  })
  amount: number;

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
    type: 'varchar2',
    length: 50,
    nullable: false,
    comment: 'Estado da referência (ACTIVE, INACTIVE, CANCELED, PAID, ERROR)',
  })
  status: string;

  @Column({
    name: 'webhook',
    type: 'clob',
    nullable: true,
    comment: 'Payload do Webhook recebido (quando aplicável)',
  })
  webhook?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    nullable: true,
  })
  updatedAt: Date;


}


import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tb_pagamentos')
export class Payment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  Codigo: number;

  @Column({ type: 'varchar', length: 45 })
  Data: string;

  @Column({ type: 'varchar', length: 25, nullable: true, unique: true })
  N_Operacao_Bancaria?: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  N_Operacao_Bancaria2?: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  Observacao?: string;

  @Column({ type: 'int', unsigned: true })
  AnoLectivo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  Totalgeral?: number;

  @Column({ type: 'datetime', nullable: true })
  DataBanco?: Date;

  @Column({ type: 'int', unsigned: true, nullable: true })
  Codigo_PreInscricao?: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  forma_pagamento?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor_depositado: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  ContaMovimentada?: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  Utilizador?: number;

  @Column({ type: 'datetime', nullable: true })
  DataRegisto?: Date;

  @Column({ type: 'int', unsigned: true, default: 3 })
  canal: number;

  @Column({ type: 'varchar', length: 450, nullable: true })
  nome_documento?: string;

  @Column({ type: 'varchar', length: 450, nullable: true })
  nome_documento2?: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  estado: number;

  @Column({
    type: 'enum',
    enum: ['BOLSA', 'NORMAL'],
    default: 'NORMAL',
    comment: 'Verifica se o pagamento foi coberto por bolsa',
  })
  tipo_pagamento: 'BOLSA' | 'NORMAL';

  @Column({ type: 'int', unsigned: true, nullable: true })
  codigo_factura?: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  instituicao_id?: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  caixa_id: number;

  @Column({
    type: 'enum',
    enum: ['pendente', 'concluido'],
    default: 'pendente',
    comment: 'Usado para o mutue cash',
  })
  status_pagamento: 'pendente' | 'concluido';

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_operacao?: Date;

  @Column({ type: 'int', unsigned: true, default: 0 })
  statusMovimento: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  info_adicional?: string;

  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  corrente: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  fk_utilizador?: number;

  @Column({
    type: 'enum',
    enum: ['Y', 'N'],
    default: 'N',
    comment: 'Indica se o pagamento foi feito com reserva',
  })
  feito_com_reserva: 'Y' | 'N';
}


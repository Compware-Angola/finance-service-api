import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_pagamentos', "schema": 'DBUMA' })
export class Payment {
  @PrimaryGeneratedColumn({ type: 'int' })
  Codigo: number;

  @Column({ type: 'varchar', "length": 45 })
  Data: string;

  @Column({ type: 'varchar', "length": 25, "nullable": true, "unique": true })
  N_Operacao_Bancaria?: string;

  @Column({ type: 'varchar', "length": 25, "nullable": true })
  N_Operacao_Bancaria2?: string;

  @Column({ type: 'varchar', "length": 1000, "nullable": true })
  Observacao?: string;

  @Column({ type: 'int' })
  AnoLectivo: number;

  // int com scale → NUMBER(15,2)
  @Column({ type: 'number', "precision": 15, "scale": 2, "nullable": true })
  Totalgeral?: number;

  @Column({ type: 'timestamp', "nullable": true })
  DataBanco?: Date;

  @Column({ type: 'int', "nullable": true })
  Codigo_PreInscricao?: number;

  @Column({ type: 'varchar', "length": 45, "nullable": true })
  forma_pagamento?: string;

  // Correção: valor monetário → number(15,2)
  @Column({ type: 'number', "precision": 15, "scale": 2 })
  valor_depositado: number;

  @Column({ type: 'int', "nullable": true })
  ContaMovimentada?: number;

  @Column({ type: 'int', "nullable": true })
  Utilizador?: number;

  @Column({ type: 'timestamp', "nullable": true })
  DataRegisto?: Date;

  @Column({ type: 'int', "default": 3 })
  canal: number;

  @Column({ type: 'varchar', "length": 450, "nullable": true })
  nome_documento?: string;

  @Column({ type: 'varchar', "length": 450, "nullable": true })
  nome_documento2?: string;

  @Column({ type: 'int', "default": 0 })
  estado: number;

  // ENUM → VARCHAR(10) + comentário
  @Column({
    type: 'varchar',
    length: 10,
    default: 'NORMAL',
    comment: 'Verifica se o pagamento foi coberto por bolsa: BOLSA ou NORMAL',
  })
  tipo_pagamento: 'BOLSA' | 'NORMAL';

  @Column({ type: 'int', "nullable": true })
  codigo_factura?: number;

  @Column({ type: 'int', "nullable": true })
  instituicao_id?: number;

  // CreateDateColumn simplificado
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'int', "default": 0 })
  caixa_id: number;

  // ENUM → VARCHAR(10)
  @Column({
    type: 'varchar',
    length: 10,
    default: 'pendente',
    comment: 'Usado para o mutue cash: pendente ou concluido',
  })
  status_pagamento: 'pendente' | 'concluido';

  // UpdateDateColumn simplificado
  @UpdateDateColumn({ type: 'timestamp', "nullable": true })
  updated_at: Date;

  @Column({ type: 'timestamp', "nullable": true })
  data_operacao?: Date;

  @Column({ type: 'int', "default": 0 })
  statusMovimento: number;

  @Column({ type: 'varchar', "length": 100, "nullable": true })
  info_adicional?: string;

  @Column({ type: 'int', "default": 1 })
  corrente: number;

  @Column({ type: 'int', "nullable": true })
  fk_utilizador?: number;

  // ENUM → VARCHAR(1)
  @Column({
    type: 'varchar',
    length: 1,
    default: 'N',
    comment: 'Indica se o pagamento foi feito com reserva: Y ou N',
  })
  feito_com_reserva: 'Y' | 'N';
}
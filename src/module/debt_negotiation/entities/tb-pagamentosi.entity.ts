import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TbPagamento } from './tb-pagamento.entity';

@Entity({ name: 'tb_pagamentosi', schema: 'DBUMA' })
export class TbPagamentosi {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_Pagamento' })
  Codigo_Pagamento: number;

  @Column({ name: 'Codigo_Servico' })
  Codigo_Servico: number;

  @Column()
  Mes: string;

  @Column({ name: 'Valor_Pago' })
  Valor_Pago: number;

  @Column({ name: 'mes_temp_id' })
  mes_temp_id: number;

  @Column({ name: 'mes_id' })
  mes_id: number;

  @ManyToOne(() => TbPagamento, p => p.itens)
  pagamento: TbPagamento;
}
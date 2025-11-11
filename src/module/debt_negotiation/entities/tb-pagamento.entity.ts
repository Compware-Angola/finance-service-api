import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { TbPreinscricao } from './tb-preinscricao.entity';
import { Factura } from './factura.entity';
import { TbPagamentosi } from './tb-pagamentosi.entity';
@Entity({ name: 'tb_pagamentos', "schema": 'DBUMA' })
export class TbPagamento {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Codigo_PreInscricao' })
  Codigo_PreInscricao: number;

  @Column({ name: 'codigo_factura' })
  codigo_factura: number;

  @Column({ name: 'AnoLectivo' })
  AnoLectivo: number;

  @Column()
  estado: number;



  @ManyToOne(() => Factura, f => f.pagamentos)
  factura: Factura;

  @OneToMany(() => TbPagamentosi, pi => pi.pagamento)
  itens: TbPagamentosi[];
}
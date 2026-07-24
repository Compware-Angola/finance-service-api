import { Entity, PrimaryColumn, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'FK2_NEGOCIACAO_DIVIDAS' })
export class DebtNegotiation extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'number' })
  id: number;

  @Column({ name: 'CODIGO_MATRICULA', type: 'number' })
  codigo_matricula: number;

  @Column({ name: 'VALOR_DIVIDA', type: 'number', nullable: true })
  valor_divida: number;

  @Column({ name: 'QTD_PRESTACOES', type: 'number' })
  qtd_prestacoes: number;

  @Column({ name: 'ID_MES_INICIAL', type: 'number', nullable: true })
  id_mes_inicial: number;

  @Column({ name: 'ID_MES_FINAL', type: 'number', nullable: true })
  id_mes_final: number;

  @Column({ name: 'PRIMEIROVALORAPAGAR', type: 'number', nullable: true })
  primeiroValorApagar: number;

  @Column({ name: 'CODIGO_ANO_LECTIVO', type: 'number' })
  codigo_ano_lectivo: number;

  @Column({ name: 'CREATED_AT', type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ name: 'UPDATED_AT', type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ name: 'MESESQUITAR', type: 'number', nullable: true })
  mesesQuitar: number;

  @Column({ name: 'VALORRESTANTE', type: 'number', nullable: true })
  valorRestante: number;

  @Column({ name: 'VALORPRESTACOES', type: 'number', nullable: true })
  valorPrestacoes: number;

  @Column({ name: 'MESESPARIMPAR', type: 'varchar2', length: 10, nullable: true })
  mesesParImpar: string;

  @Column({ name: 'CODIGO_FATURA', type: 'number' })
  codigo_fatura: number;

  @Column({ name: 'TIPO_NEGOCIACAO_ID', type: 'number' })
  tipo_negociacao_id: number;

  @Column({ name: 'ESTADO', type: 'number', nullable: true })
  estado: number;
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('negociacao_dividas')
export class DebtNegotiation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'valor_divida', type: 'decimal', precision: 10, scale: 2 })
  valor_divida: number;

  @Column({ name: 'primeiroValorApagar', type: 'decimal', precision: 10, scale: 2 })
  primeiroValorApagar: number;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: number;

  @Column({ name: 'codigo_ano_lectivo' })
  codigo_ano_lectivo: number;

  @Column({ name: 'codigo_fatura' })
  codigo_fatura: number;

  @Column({ name: 'valorRestante', type: 'decimal', precision: 10, scale: 2 })
  valorRestante: number;

  @Column({ name: 'qtd_prestacoes' })
  qtd_prestacoes: number;

  @Column({ name: 'tipo_negociacao_id' })
  tipo_negociacao_id: number;


}

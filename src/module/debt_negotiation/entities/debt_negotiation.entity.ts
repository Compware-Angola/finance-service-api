import { Entity, PrimaryColumn, Column, BeforeInsert } from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'UMA_NEGOCIACAO_DIVIDAS' })
export class DebtNegotiation extends BaseEntity {
  @PrimaryColumn({ name: 'id', type: 'number' })
  id: number;

  @Column({ name: 'codigo_matricula', type: 'number' })
  codigo_matricula: number;

  @Column({ name: 'valor_divida', type: 'number', nullable: true })
  valor_divida: number;

  @Column({ name: 'qtd_prestacoes', type: 'number' })
  qtd_prestacoes: number;

  @Column({ name: 'id_mes_inicial', type: 'number', nullable: true })
  id_mes_inicial: number;

  @Column({ name: 'id_mes_final', type: 'number', nullable: true })
  id_mes_final: number;

  @Column({ name: 'primeiroValorApagar', type: 'number', nullable: true })
  primeiroValorApagar: number;

  @Column({ name: 'codigo_ano_lectivo', type: 'number' })
  codigo_ano_lectivo: number;

  @Column({ name: 'mesesQuitar', type: 'number', nullable: true })
  mesesQuitar: number;

  @Column({ name: 'valorRestante', type: 'number', nullable: true })
  valorRestante: number;

  @Column({ name: 'valorPrestacoes', type: 'number', nullable: true })
  valorPrestacoes: number;

  @Column({ name: 'mesesParImpar', type: 'varchar2', length: 10, nullable: true })
  mesesParImpar: string;

  @Column({ name: 'codigo_fatura', type: 'number' })
  codigo_fatura: number;

  @Column({ name: 'tipo_negociacao_id', type: 'number' })
  tipo_negociacao_id: number;

  @Column({ name: 'estado', type: 'number', nullable: true })
  estado: number;

  // ===== GERA O ID SEQUENCIAL AUTOMATICAMENTE =====
  @BeforeInsert()
  async generateId() {
    if (!this.id) {
      const repo = (this.constructor as any).repo;
      if (!repo) throw new Error('Repositório não configurado. Use setRepository()');

      console.log('GERANDO ID DA NEGOCIAÇÃO...');

      const last = await repo
        .createQueryBuilder('n')
        .select('n.id', 'n_id')
        .where("REGEXP_LIKE(n.id, '^[0-9]+$')")
        .orderBy('TO_NUMBER(n.id)', 'DESC')
        .limit(1)
        .getRawOne();

      let nextId = 1000;
      if (last && last.n_id) {
        const lastNum = Number(last.n_id);
        if (!isNaN(lastNum)) nextId = lastNum + 1;
      }

      this.id = nextId;
      console.log('ID GERADO:', this.id);
    }
  }
}

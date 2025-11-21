import { Entity, PrimaryColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'UMA_NEGOCIACAO_DIVIDAS', })
export class DebtNegotiation extends BaseEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar2', length: 20 })
  id: string;

  @Column({ name: 'codigo_matricula', type: 'varchar2', length: 20 })
  codigo_matricula: string;

  @Column({ name: 'valor_divida', type: 'varchar2', length: 20, nullable: true })
  valor_divida: string;

  @Column({ name: 'qtd_prestacoes', type: 'varchar2', length: 5 })
  qtd_prestacoes: string;

  @Column({ name: 'id_mes_inicial', type: 'varchar2', length: 5, nullable: true })
  id_mes_inicial: string;

  @Column({ name: 'id_mes_final', type: 'varchar2', length: 5, nullable: true })
  id_mes_final: string;

  @Column({ name: 'primeiroValorApagar', type: 'varchar2', length: 20, nullable: true })
  primeiroValorApagar: string;

  @Column({ name: 'codigo_ano_lectivo', type: 'varchar2', length: 10 })
  codigo_ano_lectivo: string;

  @Column({ name: 'mesesQuitar', type: 'varchar2', length: 20, nullable: true })
  mesesQuitar: string;

  @Column({ name: 'valorRestante', type: 'varchar2', length: 20, nullable: true })
  valorRestante: string;

  @Column({ name: 'valorPrestacoes', type: 'varchar2', length: 20, nullable: true })
  valorPrestacoes: string;

  @Column({ name: 'mesesParImpar', type: 'varchar2', length: 10, nullable: true })
  mesesParImpar: string;

  @Column({ name: 'codigo_fatura', type: 'varchar2', length: 20 })
  codigo_fatura: string;

  @Column({ name: 'tipo_negociacao_id', type: 'varchar2', length: 10 })
  tipo_negociacao_id: string;

  @Column({ name: 'estado', type: 'varchar2', length: 20, nullable: true })
  estado: string;

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

      console.log('ÚLTIMA NEGOCIAÇÃO ENCONTRADA:', last);

      let nextId = 1000;
      if (last && last.n_id) {
        const lastNum = Number(last.n_id);
        if (!isNaN(lastNum)) nextId = lastNum + 1;
      }

      this.id = nextId.toString();
      console.log('ID GERADO:', this.id);
    }
  }

  // ===== GARANTE QUE TODOS OS VALORES SERÃO STRINGS =====
  @BeforeInsert()
  @BeforeUpdate()
  convertToString() {
    this.codigo_matricula = this.codigo_matricula?.toString();
    this.valor_divida = this.valor_divida?.toString();
    this.qtd_prestacoes = this.qtd_prestacoes?.toString();
    this.id_mes_inicial = this.id_mes_inicial?.toString();
    this.id_mes_final = this.id_mes_final?.toString();
    this.primeiroValorApagar = this.primeiroValorApagar?.toString();
    this.codigo_ano_lectivo = this.codigo_ano_lectivo?.toString();
    this.mesesQuitar = this.mesesQuitar?.toString();
    this.valorRestante = this.valorRestante?.toString();
    this.valorPrestacoes = this.valorPrestacoes?.toString();
    this.mesesParImpar = this.mesesParImpar?.toString();
    this.codigo_fatura = this.codigo_fatura?.toString();
    this.tipo_negociacao_id = this.tipo_negociacao_id?.toString();
    this.estado = this.estado?.toString();
  }
}

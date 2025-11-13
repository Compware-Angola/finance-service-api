
import { Entity, PrimaryColumn, Column, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'negociacao_dividas', schema: 'DBUMA' })
export class DebtNegotiation extends BaseEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar2', length: 20 }) 
  id: string;

  @Column({ name: 'valor_divida', type: 'varchar2', length: 20, nullable: true })
  valor_divida: string;

  @Column({ name: 'primeiroValorApagar', type: 'varchar2', length: 20, nullable: true })
  primeiroValorApagar: string;

  @Column({ name: 'codigo_matricula', type: 'varchar2', length: 20 })
  codigo_matricula: string;

  @Column({ name: 'codigo_ano_lectivo', type: 'varchar2', length: 10 })
  codigo_ano_lectivo: string;

  @Column({ name: 'codigo_fatura', type: 'varchar2', length: 20 })
  codigo_fatura: string;

  @Column({ name: 'valorRestante', type: 'varchar2', length: 20, nullable: true })
  valorRestante: string;

  @Column({ name: 'qtd_prestacoes', type: 'varchar2', length: 5 })
  qtd_prestacoes: string;

  @Column({ name: 'tipo_negociacao_id', type: 'varchar2', length: 10 })
  tipo_negociacao_id: string;

  @Column({ name: 'valor_prestacao_mensal', type: 'varchar2', length: 20, nullable: true })
  valor_prestacao_mensal: string;

  // GERA O ID SEQUENCIAL
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

      let nextId = 1000; // ← Começa do 1000
      if (last && last.n_id) {
        const lastNum = Number(last.n_id);
        if (!isNaN(lastNum)) {
          nextId = lastNum + 1;
        }
      }

      this.id = nextId.toString();
      console.log('ID GERADO:', this.id);
    }
  }

  // CONVERTE ANTES DE SALVAR
  @BeforeInsert()
  @BeforeUpdate()
  convertToString() {
    this.valor_divida = this.valor_divida?.toString();
    this.primeiroValorApagar = this.primeiroValorApagar?.toString();
    this.codigo_matricula = this.codigo_matricula?.toString();
    this.codigo_ano_lectivo = this.codigo_ano_lectivo?.toString();
    this.codigo_fatura = this.codigo_fatura?.toString();
    this.valorRestante = this.valorRestante?.toString();
    this.qtd_prestacoes = this.qtd_prestacoes?.toString();
    this.tipo_negociacao_id = this.tipo_negociacao_id?.toString();
    this.valor_prestacao_mensal = this.valor_prestacao_mensal?.toString();
  }
}
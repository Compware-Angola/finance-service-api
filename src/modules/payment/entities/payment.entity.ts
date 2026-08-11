// payment.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'UMA_TB_PAGAMENTOS' })
export class Payment extends BaseEntity {
  @PrimaryColumn({ name: 'Codigo', type: 'varchar2', length: 20 })
  Codigo: string;

  @Column({ type: 'varchar', length: 45 })
  Data: string;

  @Column({ type: 'varchar', length: 25, nullable: true, unique: true })
  N_Operacao_Bancaria?: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  N_Operacao_Bancaria2?: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  Observacao?: string;

  @Column({ type: 'int' })
  AnoLectivo: number;

  @Column({ type: 'number', precision: 15, scale: 2, nullable: true })
  Totalgeral?: number;

  @Column({ type: 'timestamp', nullable: true })
  DataBanco?: Date;
  @Column({
    name: 'Codigo_PreInscricao',
    type: 'varchar2',
    length: 20,
    nullable: true,
  })
  Codigo_PreInscricao?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  forma_pagamento?: string;

  @Column({ type: 'number', precision: 15, scale: 2 })
  valor_depositado: number;

  @Column({ type: 'int', nullable: true })
  ContaMovimentada?: number;

  @Column({ type: 'int', nullable: true })
  Utilizador?: number;

  @Column({ type: 'timestamp', nullable: true })
  DataRegisto?: Date;

  @Column({ type: 'int', default: 3 })
  canal: number;

  @Column({ type: 'varchar', length: 450, nullable: true })
  nome_documento?: string;

  @Column({ type: 'varchar', length: 450, nullable: true })
  nome_documento2?: string;

  @Column({ type: 'int', default: 0 })
  estado: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'NORMAL',
    comment: 'Verifica se o pagamento foi coberto por bolsa: BOLSA ou NORMAL',
  })
  tipo_pagamento: 'BOLSA' | 'NORMAL';

  @Column({ type: 'int', nullable: true })
  codigo_factura?: number;

  @Column({ type: 'int', nullable: true })
  instituicao_id?: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'int', default: 0 })
  caixa_id: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'pendente',
    comment: 'Usado para o mutue cash: pendente ou concluido',
  })
  status_pagamento: 'pendente' | 'concluido';

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_operacao?: Date;

  @Column({ type: 'int', default: 0 })
  statusMovimento: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  info_adicional?: string;

  @Column({ type: 'int', default: 1 })
  corrente: number;

  @Column({ type: 'int', nullable: true })
  fk_utilizador?: number;

  @Column({
    type: 'varchar',
    length: 1,
    default: 'N',
    comment: 'Indica se o pagamento foi feito com reserva: Y ou N',
  })
  feito_com_reserva: 'Y' | 'N';

  // GERA O CÓDIGO SEQUENCIAL
  @BeforeInsert()
  async generateCodigo() {
    if (!this.Codigo) {
      const repo = (this.constructor as any).repo;
      if (!repo)
        throw new Error('Repositório não configurado. Use setRepository()');

      console.log('GERANDO CÓDIGO DO PAGAMENTO...');

      const last = await repo
        .createQueryBuilder('p')
        .select('p.Codigo', 'p_codigo')
        .where("REGEXP_LIKE(p.Codigo, '^[0-9]+$')")
        .orderBy('TO_NUMBER(p.Codigo)', 'DESC')
        .limit(1)
        .getRawOne();

      console.log('ÚLTIMO PAGAMENTO ENCONTRADO:', last);

      let nextCode = 50000; // ← Começa do 50000
      if (last && last.p_codigo) {
        const lastNum = Number(last.p_codigo);
        if (!isNaN(lastNum)) {
          nextCode = lastNum + 1;
        }
      }

      this.Codigo = nextCode.toString();
      console.log('CÓDIGO GERADO PARA PAGAMENTO:', this.Codigo);
    }
  }
}

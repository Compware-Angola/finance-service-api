import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { FacturaItem } from './factura-item.entity';

@Entity({ name: 'UMA_TB_TIPO_SERVICOS', "schema": 'DBUMA' })
export class TbTipoServico {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Descricao: string;

  @Column()
  Preco: number;

  @Column()
  TipoServico: string;

  @Column()
  cacuaco: number;

  @Column({ name: 'codigo_ano_lectivo' })
  codigo_ano_lectivo: number;

  @Column({ name: 'taxa_iva_id' })
  taxa_iva_id: number;

  @Column({ name: 'motivo_isencao_iva_codigo' })
  motivo_isencao_iva_codigo: number;

  @Column({ name: 'codigo_grade_currilular' })
  codigo_grade_currilular: string;

  @OneToMany(() => FacturaItem, fi => fi.produto)
  itens: FacturaItem[];
}
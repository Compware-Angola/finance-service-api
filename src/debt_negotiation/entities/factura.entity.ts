import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { FacturaItem } from './factura-item.entity';
import { TbPagamento } from './tb-pagamento.entity';
import { InscricaoAvaliacao } from './inscricao-avaliacao.entity';
import { TbAnoLectivo } from './tb-ano-lectivo.entity';

@Entity('factura')
export class Factura {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'CodigoMatricula' })
  CodigoMatricula: number;

  @Column({ name: 'ValorAPagar' })
  ValorAPagar: number;

  @Column()
  estado: number;

  @Column()
  corrente: number;

  @Column({ name: 'ano_lectivo' })
  ano_lectivo: number;

  @OneToMany(() => FacturaItem, fi => fi.factura)
  items: FacturaItem[];

  @OneToMany(() => TbPagamento, p => p.factura)
  pagamentos: TbPagamento[];

  @OneToMany(() => InscricaoAvaliacao, ia => ia.factura)
  avaliacoes: InscricaoAvaliacao[];

  @ManyToOne(() => TbAnoLectivo, al => al.facturas)
  anoLectivo: TbAnoLectivo;
}
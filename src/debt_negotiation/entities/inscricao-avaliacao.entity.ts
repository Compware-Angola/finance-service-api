import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Factura } from './factura.entity';

@Entity('inscricao_avaliacoes')
export class InscricaoAvaliacao {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: number;

  @Column({ name: 'codigo_factura' })
  codigo_factura: number;

  @Column({ name: 'codigo_grade' })
  codigo_grade: string;

  @Column({ name: 'codigo_ano_lectivo' })
  codigo_ano_lectivo: number;

  @Column({ name: 'codigo_tipo_avaliacao' })
  codigo_tipo_avaliacao: number;

  @Column()
  estado: string;

  @ManyToOne(() => Factura, f => f.avaliacoes)
  factura: Factura;
}
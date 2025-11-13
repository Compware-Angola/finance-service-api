import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Factura } from './factura.entity';

@Entity({ name: 'inscricao_avaliacoes', "schema": 'DBUMA' })
export class InscricaoAvaliacao {
  @PrimaryGeneratedColumn()
  codigo: string;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: string;

  @Column({ name: 'codigo_factura' })
  codigo_factura: string;

  @Column({ name: 'codigo_grade' })
  codigo_grade: string;

  @Column({ name: 'codigo_ano_lectivo' })
  codigo_ano_lectivo: string;

  @Column({ name: 'codigo_tipo_avaliacao' })
  codigo_tipo_avaliacao: string;

  @Column()
  estado: string;

}
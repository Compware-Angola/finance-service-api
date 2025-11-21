import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TbPreinscricao } from './tb-preinscricao.entity';

@Entity({ name: 'UMA_TB_ADMISSAO', })
export class TbAdmissao {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'pre_incricao' })
  pre_incricao: number;


}
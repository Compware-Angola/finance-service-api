import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TbPreinscricao } from './tb-preinscricao.entity';

@Entity('tb_admissao')
export class TbAdmissao {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'pre_incricao' })
  pre_incricao: number;

  @ManyToOne(() => TbPreinscricao, p => p.admissao)
  preinscricao: TbPreinscricao;
}
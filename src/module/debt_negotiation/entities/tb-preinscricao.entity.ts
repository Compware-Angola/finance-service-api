import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { TbPagamento } from './tb-pagamento.entity';
import { TbAdmissao } from './tb-admissao.entity';
@Entity('tb_preinscricao')
export class TbPreinscricao {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column({ name: 'Bilhete_Identidade' })
  Bilhete_Identidade: string;

  @Column({ name: 'Contactos_Telefonicos' })
  Contactos_Telefonicos: string;

  @Column()
  Email: string;

  @Column({ name: 'AlunoCacuaco' })
  AlunoCacuaco: number;

  @Column()
  desconto: number;

  @Column({ name: 'Curso_Candidatura' })
  Curso_Candidatura: number;

  @Column({ name: 'saldo_reset' })
  saldo_reset: number;

  @Column({ name: 'codigo_tipo_candidatura' })
  codigo_tipo_candidatura: number;

  @Column({ name: 'anoLectivo' })
  anoLectivo: number;

  @OneToMany(() => TbPagamento, p => p.preinscricao)
  pagamentos: TbPagamento[];

  @OneToMany(() => TbAdmissao, a => a.preinscricao)
  admissao: TbAdmissao[];
}
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tb_bolseiro_siiuma')
export class TbBolseiroSiiuma {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: number;

  @Column()
  ano: string;

  @Column()
  desconto: number;

  @Column()
  instituicao: string;

  @Column({ name: 'tipo_bolsa' })
  tipo_bolsa: string;
}
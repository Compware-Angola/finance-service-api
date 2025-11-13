import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TB_BOLSEIRO_SIIUMA', "schema": 'DBUMA' })
export class TbBolseiroSiiuma {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: number;

  @Column()
  ano: string;
  @Column({ type: "varchar", "length": 450, "name": "nome" })
  nome: string;

  @Column()
  desconto: number;

  @Column()
  instituicao: string;

}
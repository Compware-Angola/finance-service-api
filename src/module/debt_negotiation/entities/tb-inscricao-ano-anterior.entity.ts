import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'UMA_TB_INSCRICOES_ANO_ANTERIOR', "schema": 'DBUMA' })
export class TbInscricaoAnoAnterior {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column({ name: 'codigo_matricula' })
  codigo_matricula: number;

  @Column({ name: 'codigo_ano_lectivo' })
  codigo_ano_lectivo: number;

  @Column()
  status: number;
}
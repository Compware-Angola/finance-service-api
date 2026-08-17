// sigla-tipo-servico.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('FK2_TB_SIGLA_TIPO_SERVICOS')
export class SiglaTipoServico {
  @PrimaryGeneratedColumn({ name: 'CODIGO' })
  codigo!: number;

  @Column({ name: 'SIGLA', type: 'varchar2', length: 50, nullable: false })
  sigla!: string;

  @Column({ name: 'DESCRICAO', type: 'varchar2', length: 300, nullable: false })
  descricao!: string;

  @Column({
    name: 'TIPO_CANDIDATURA',
    type: 'number',
    nullable: false,
    default: 1,
  })
  tipo_candidatura!: number;
}

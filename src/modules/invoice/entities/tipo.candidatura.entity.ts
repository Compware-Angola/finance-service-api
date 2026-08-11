import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({
  name: 'FK2_TB_TIPO_CANDIDATURA',
})
export class TipoCandidatura {
  @PrimaryColumn({
    name: 'ID',
    type: 'number',
  })
  id: number;

  @Column({
    name: 'DESIGNACAO',
    type: 'varchar2',
    length: 45,
    nullable: true,
  })
  designacao?: string;

  @Column({
    name: 'SIGLA',
    type: 'varchar2',
    length: 45,
    nullable: true,
  })
  sigla?: string;

  @Column({
    name: 'STATUS_',
    type: 'number',
    nullable: true,
  })
  status?: number;

  @Column({
    name: 'USER_ID',
    type: 'number',
    nullable: true,
  })
  userId?: number;

  @Column({
    name: 'CANAL',
    type: 'varchar2',
    length: 45,
    nullable: true,
  })
  canal?: string;
}

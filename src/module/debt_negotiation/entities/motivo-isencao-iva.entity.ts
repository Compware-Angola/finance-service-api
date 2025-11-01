import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('motivos_isencao_iva')
export class MotivoIsencaoIva {
  @PrimaryGeneratedColumn()
  codigo: number;

  @Column()
  descricao: string;
}
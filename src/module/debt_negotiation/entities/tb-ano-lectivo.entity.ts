import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Factura } from './factura.entity';


@Entity({ name: 'UMA_TB_ANO_LECTIVO', })
export class TbAnoLectivo {
  @PrimaryGeneratedColumn()
  Codigo: number;

  @Column()
  Designacao: string;

  @Column()
  ordem: number;

  @OneToMany(() => Factura, f => f.anoLectivo)
  facturas: Factura[];
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('empresas')
@Index('FK_empresas_paises', ['pais_id'])
@Index('FK_empresas_status', ['statu_id'])
@Index('FK_empresas_tipos_clientes', ['tipo_cliente_id'])
@Index('FK_empresas_regimes', ['tipo_regime_id'])
export class Empresa {
  @PrimaryGeneratedColumn('increment', { unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  designacao: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  nome: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  pessoal_Contacto: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  telefone_empresa: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  telefone_empresa2: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  telefone_empresa3: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  endereco: string | null;

  @Column({ type: 'int', unsigned: true, default: 1 })
  pais_id: number;

  @Column({ type: 'int', unsigned: true, default: 1 })
  statu_id: number;

  @Column({ type: 'varchar', length: 45, nullable: true, collation: 'latin1_swedish_ci' })
  nif: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  tipo_cliente_id: number | null;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  tipo_regime_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  logotipo: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  website: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  email: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true, collation: 'latin1_swedish_ci' })
  referencia: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  cidade: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  file_alvara: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, collation: 'latin1_swedish_ci' })
  file_nif: string | null;

}
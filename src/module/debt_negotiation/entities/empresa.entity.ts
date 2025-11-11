import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'empresas', schema: 'DBUMA' })
@Index('FK_empresas_paises', ['pais_id'])
@Index('FK_empresas_status', ['statu_id'])
@Index('FK_empresas_tipos_clientes', ['tipo_cliente_id'])
@Index('FK_empresas_regimes', ['tipo_regime_id'])
export class Empresa {
  // increment + unsigned → int simples (Oracle cria sequência auto)
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  designacao: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  nome: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  pessoal_Contacto: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  telefone_empresa: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  telefone_empresa2: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  telefone_empresa3: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endereco: string | null;

  @Column({ type: 'int', default: 1 })
  pais_id: number;

  @Column({ type: 'int', default: 1 })
  statu_id: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  nif: string | null;

  @Column({ type: 'int', nullable: true })
  tipo_cliente_id: number | null;

  // BIGINT → NUMBER(19,0)
  @Column({ type: 'number', precision: 19, scale: 0, nullable: true })
  tipo_regime_id: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logotipo: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 145, nullable: true })
  referencia: string | null;

  // CreateDateColumn simplificado
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  // UpdateDateColumn simplificado
  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cidade: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_alvara: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_nif: string | null;
}
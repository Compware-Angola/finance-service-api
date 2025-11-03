import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { TbPagamento } from './tb-pagamento.entity';
import { TbAdmissao } from './tb-admissao.entity';


@Entity('tb_preinscricao')
export class TbPreinscricao {
  
  // A CHAVE PRIMÁRIA
  @PrimaryGeneratedColumn({ name: 'Codigo', type: 'int', unsigned: true })
  Codigo: number;

  // --- Chaves Estrangeiras (Mapeadas como ID) ---
  @Column({ name: 'Naturaza_Inscricao', type: 'int', unsigned: true, nullable: true })
  Naturaza_Inscricao: number | null;

  @Column({ name: 'Curso_Candidatura', type: 'int', unsigned: true, nullable: true })
  Curso_Candidatura: number | null; // Já existia, mas aqui está com o tipo correto

  @Column({ name: 'Modalidade_Frequencia', type: 'int', unsigned: true, nullable: true })
  Modalidade_Frequencia: number | null;

  @Column({ name: 'Instituicao_Formacao_Acesso', type: 'int', unsigned: true, nullable: true })
  Instituicao_Formacao_Acesso: number | null;

  @Column({ name: 'Provincia_Trabalho', type: 'int', unsigned: true, nullable: true })
  Provincia_Trabalho: number | null;

  @Column({ name: 'codigo_utilizador', type: 'int', unsigned: true, nullable: true })
  codigoUtilizador: number | null; // Usando camelCase para a propriedade

  @Column({ name: 'Codigo_Turno', type: 'int', unsigned: true, default: 4 })
  Codigo_Turno: number;

  @Column({ name: 'Codigo_Nacionalidade', type: 'int', unsigned: true, default: 1 })
  Codigo_Nacionalidade: number;

  @Column({ name: 'tipo_identificacao', type: 'int', unsigned: true, nullable: true })
  tipoIdentificacao: number | null;

  @Column({ name: 'anoLectivo', type: 'int', unsigned: true, default: 1 })
  anoLectivo: number; // Já existia

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: string | null; // bigint pode ser mapeado como string ou number

  @Column({ name: 'polo_id', type: 'bigint', unsigned: true, default: 1 })
  poloId: string;

  @Column({ name: 'cursoOpcional1_id', type: 'int', unsigned: true, nullable: true })
  cursoOpcional1Id: number | null;

  @Column({ name: 'cursoOpcional2_id', type: 'int', unsigned: true, nullable: true })
  cursoOpcional2Id: number | null;

  @Column({ name: 'Codigo_Ocupacao', type: 'int', default: 1 })
  Codigo_Ocupacao: number;

  @Column({ name: 'Codigo_Profissao', type: 'int', default: 1 })
  Codigo_Profissao: number;

  @Column({ name: 'Codigo_Habilitacao_Anterior', type: 'int', unsigned: true, default: 23 })
  Codigo_Habilitacao_Anterior: number;

  @Column({ name: 'Codigo_Tipo_Estabelecimento_Secundario', type: 'int', unsigned: true, default: 4 })
  Codigo_Tipo_Estabelecimento_Secundario: number;

  @Column({ name: 'Codigo_pais_habilitacao_anterior', type: 'int', unsigned: true, default: 1 })
  Codigo_pais_habilitacao_anterior: number;

  @Column({ name: 'Codigo_Turno_optional', type: 'int', unsigned: true, default: 5 })
  Codigo_Turno_optional: number;

  @Column({ name: 'necessidade_especial_id', type: 'int', unsigned: true, default: 1 })
  necessidadeEspecialId: number;

  @Column({ name: 'canal', type: 'int', unsigned: true, default: 2 })
  canal: number;

  @Column({ name: 'codigo_grau_academico', type: 'int', unsigned: true, default: 1 })
  codigoGrauAcademico: number;

  @Column({ name: 'local_emissao_bi', type: 'int', unsigned: true, default: 1 })
  localEmissaoBi: number;
  
  // Ocupação e Grau Académico dos Familiares
  @Column({ name: 'ocupacao_pai', type: 'int', default: 1 })
  ocupacaoPai: number;
  
  @Column({ name: 'ocupacao_mae', type: 'int', default: 1 })
  ocupacaoMae: number;
  
  @Column({ name: 'ocupacao_conjuge', type: 'int', default: 1 })
  ocupacaoConjuge: number;
  
  @Column({ name: 'profissao_pai', type: 'int', default: 1 })
  profissaoPai: number;
  
  @Column({ name: 'profissao_mae', type: 'int', default: 1 })
  profissaoMae: number;
  
  @Column({ name: 'profissao_conjuge', type: 'int', default: 1 })
  profissaoConjuge: number;
  
  @Column({ name: 'grau_academico_pai', type: 'int', unsigned: true, default: 1 })
  grauAcademicoPai: number;
  
  @Column({ name: 'grau_academico_mae', type: 'int', unsigned: true, default: 1 })
  grauAcademicoMae: number;
  
  @Column({ name: 'grau_academico_conjuge', type: 'int', unsigned: true, default: 1 })
  grauAcademicoConjuge: number;

  @Column({ name: 'codigo_provincia_residencia_permanente', type: 'int', unsigned: true, default: 1 })
  codigoProvinciaResidenciaPermanente: number;
  
  @Column({ name: 'codigo_provincia_naturalidade', type: 'int', unsigned: true, default: 1 })
  codigoProvinciaNaturalidade: number;

  @Column({ name: 'codigo_tipo_candidatura', type: 'int', unsigned: true, default: 1 })
  codigo_tipo_candidatura: number; // Já existia

  @Column({ name: 'codigo_forma_ingresso', type: 'int', unsigned: true, default: 1 })
  codigoFormaIngresso: number;

  @Column({ name: 'codigo_curso_pagamento', type: 'int', unsigned: true, nullable: true })
  codigoCursoPagamento: number | null;

  @Column({ name: 'codigo_municipio', type: 'int', unsigned: true, nullable: true })
  codigoMunicipio: number | null;

  // --- Dados Pessoais ---
  
  @Column({ name: 'Bilhete_Identidade', length: 250, nullable: true })
  Bilhete_Identidade: string | null; // Já existia

  @Column({ name: 'Numero_Identificacao_Fiscal', length: 60, nullable: true })
  Numero_Identificacao_Fiscal: string | null;

  @Column({ name: 'Sexo', length: 45, nullable: true })
  Sexo: string | null;

  @Column({ name: 'Data_Nascimento', type: 'date', nullable: true })
  Data_Nascimento: Date | null;

  @Column({ name: 'Estado_Civil', length: 45, nullable: true })
  Estado_Civil: string | null;
  
  @Column({ name: 'Contactos_Telefonicos', length: 100, nullable: true })
  Contactos_Telefonicos: string | null; // Já existia

  @Column({ name: 'contacto_de_emergencia', length: 30, nullable: true })
  contacto_de_emergencia: string | null;

  @Column({ name: 'Morada_Completa', length: 550, nullable: true })
  Morada_Completa: string | null;

  @Column({ name: 'Email', length: 455, nullable: true })
  Email: string | null; // Já existia

  @Column({ name: 'Nome_Pessoa_Contacto_Telefone', length: 250, nullable: true })
  Nome_Pessoa_Contacto_Telefone: string | null;

  @Column({ name: 'Data_Conclusao', type: 'date', nullable: true })
  Data_Conclusao: Date | null;

  @Column({ name: 'Media_Final', type: 'float', nullable: true })
  Media_Final: number | null;

  @Column({ name: 'Numero_Ordem_Medicos', length: 70, nullable: true })
  Numero_Ordem_Medicos: string | null;

  @Column({ name: 'Instituicao_Exerce_Funcao', length: 250, nullable: true })
  Instituicao_Exerce_Funcao: string | null;

  @Column({ name: 'Data_Inicio_Trabalho', type: 'date', nullable: true })
  Data_Inicio_Trabalho: Date | null;

  @Column({ name: 'data_emissao_bi', type: 'date', nullable: true })
  data_emissao_bi: Date | null;

  @Column({ name: 'data_validade_bi', type: 'date', nullable: true })
  data_validade_bi: Date | null;

  @Column({ name: 'data_preescrincao', length: 50, nullable: true })
  data_preescrincao: string | null;

  @Column({ name: 'data_ultima_actualizacao', length: 50, nullable: true })
  data_ultima_actualizacao: string | null;

  @Column({ name: 'Pai', length: 250, nullable: true })
  Pai: string | null;

  @Column({ name: 'Mae', length: 250, nullable: true })
  Mae: string | null;

  @Column({ name: 'Naturalidade', length: 250, default: 'Nao definido' })
  Naturalidade: string;

  @Column({ name: 'Instituicao_Formacao', length: 250, nullable: true })
  Instituicao_Formacao: string | null;

  @Column({ name: 'provincia_origem', length: 45, nullable: true })
  provincia_origem: string | null;
  
  @Column({ name: 'estado', type: 'int', unsigned: true, default: 0 })
  estado: number;

  @Column({ name: 'Deslocado_Permanente', type: 'tinyint', width: 1, default: 0 })
  Deslocado_Permanente: boolean;

  @Column({ name: 'AlunoCacuaco', length: 3, default: 'NAO', type: 'enum', enum: ['SIM', 'NAO'] })
  AlunoCacuaco: string; // Já existia, ajustado para 'string' para o ENUM

  @Column({ name: 'curso_ensino_medio', length: 145, nullable: true })
  curso_ensino_medio: string | null;
  
  // --- Dados Financeiros ---
  @Column({ name: 'desconto', type: 'double', default: 0 })
  desconto: number; // Já existia

  @Column({ name: 'saldo', type: 'double', unsigned: true, default: 0 })
  saldo: number;

  @Column({ name: 'saldo_anterior', type: 'double', default: 0 })
  saldo_anterior: number;

  @Column({ name: 'obs_saldo', type: 'text', nullable: true })
  obs_saldo: string | null;

  @Column({ name: 'obs_desconto', type: 'text', nullable: true })
  obs_desconto: string | null;

  @Column({ name: 'saldo_reset', type: 'double', default: 0 })
  saldo_reset: number; // Já existia

  @Column({ name: 'saldo_reset_anter', type: 'double', default: 0 })
  saldo_reset_anter: number;

  // --- Flags/Status ---
  @Column({ name: 'codigo_validacao_email', length: 45, nullable: true })
  codigo_validacao_email: string | null;

  @Column({ name: 'estado_atualizacao_email', type: 'int', unsigned: true, default: 0 })
  estado_atualizacao_email: number;

  @Column({ name: 'permitir_inscricao', type: 'enum', enum: ['NAO', 'SIM'], nullable: true })
  permitir_inscricao: 'NAO' | 'SIM' | null;

  @Column({ name: 'isencao_multa', type: 'enum', enum: ['NAO', 'SIM'], nullable: true })
  isencao_multa: 'NAO' | 'SIM' | null;

  @Column({ name: 'estado_preiscricao_candidato', type: 'enum', enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' })
  estado_preiscricao_candidato: 'ACTIVO' | 'INACTIVO';

  // --- Data/Hora ---
  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  created_at: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  // --- Relacionamentos (mantidos do seu código) ---
  @OneToMany(() => TbPagamento, p => p.preinscricao)
  pagamentos: TbPagamento[];

  @OneToMany(() => TbAdmissao, a => a.preinscricao)
  admissao: TbAdmissao[];
}
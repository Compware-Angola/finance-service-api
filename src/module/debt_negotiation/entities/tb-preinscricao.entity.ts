import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'tb_preinscricao', "schema": 'DBUMA' })
export class TbPreinscricao {
  @PrimaryGeneratedColumn({ name: 'Codigo', "type": 'int' })
  Codigo: number;

  @Column({ name: 'Naturaza_Inscricao', "type": 'int', "nullable": true })
  Naturaza_Inscricao: number | null;

  @Column({ name: 'Curso_Candidatura', "type": 'int', "nullable": true })
  Curso_Candidatura: number | null;

  @Column({ name: 'Modalidade_Frequencia', "type": 'int', "nullable": true })
  Modalidade_Frequencia: number | null;

  @Column({ name: 'Instituicao_Formacao_Acesso', "type": 'int', "nullable": true })
  Instituicao_Formacao_Acesso: number | null;

  @Column({ name: 'Provincia_Trabalho', "type": 'int', "nullable": true })
  Provincia_Trabalho: number | null;

  @Column({ name: 'codigo_utilizador', "type": 'int', "nullable": true })
  codigoUtilizador: number | null;

  @Column({ name: 'Codigo_Turno', "type": 'int', "default": 4 })
  Codigo_Turno: number;

  @Column({ name: 'Codigo_Nacionalidade', "type": 'int', "default": 1 })
  Codigo_Nacionalidade: number;

  @Column({ name: 'tipo_identificacao', "type": 'int', "nullable": true })
  tipoIdentificacao: number | null;

  @Column({ name: 'anoLectivo', "type": 'int', "default": 1 })
  anoLectivo: number;

  // BIGINT → NUMBER(19,0)
  @Column({ name: 'user_id', "type": 'number', "precision": 19, "scale": 0, "nullable": true })
  userId: number | null; // mudei de string para number (corrige inconsistência)

  @Column({ name: 'polo_id', "type": 'number', "precision": 19, "scale": 0, "default": 1 })
  poloId: number;

  @Column({ name: 'cursoOpcional1_id', "type": 'int', "nullable": true })
  cursoOpcional1Id: number | null;

  @Column({ name: 'cursoOpcional2_id', "type": 'int', "nullable": true })
  cursoOpcional2Id: number | null;

  @Column({ name: 'Codigo_Ocupacao', "type": 'int', "default": 1 })
  Codigo_Ocupacao: number;

  @Column({ name: 'Codigo_Profissao', "type": 'int', "default": 1 })
  Codigo_Profissao: number;

  @Column({ name: 'Codigo_Habilitacao_Anterior', "type": 'int', "default": 23 })
  Codigo_Habilitacao_Anterior: number;

  @Column({ name: 'Codigo_Tipo_Estabelecimento_Secundario', "type": 'int', "default": 4 })
  Codigo_Tipo_Estabelecimento_Secundario: number;

  @Column({ name: 'Codigo_pais_habilitacao_anterior', "type": 'int', "default": 1 })
  Codigo_pais_habilitacao_anterior: number;

  @Column({ name: 'Codigo_Turno_optional', "type": 'int', "default": 5 })
  Codigo_Turno_optional: number;

  @Column({ name: 'necessidade_especial_id', "type": 'int', "default": 1 })
  necessidadeEspecialId: number;

  @Column({ name: 'canal', "type": 'int', "default": 2 })
  canal: number;

  @Column({ name: 'codigo_grau_academico', "type": 'int', "default": 1 })
  codigoGrauAcademico: number;

  @Column({ name: 'local_emissao_bi', "type": 'int', "default": 1 })
  localEmissaoBi: number;

  @Column({ name: 'ocupacao_pai', "type": 'int', "default": 1 })
  ocupacaoPai: number;

  @Column({ name: 'ocupacao_mae', "type": 'int', "default": 1 })
  ocupacaoMae: number;

  @Column({ name: 'ocupacao_conjuge', "type": 'int', "default": 1 })
  ocupacaoConjuge: number;

  @Column({ name: 'profissao_pai', "type": 'int', "default": 1 })
  profissaoPai: number;

  @Column({ name: 'profissao_mae', "type": 'int', "default": 1 })
  profissaoMae: number;

  @Column({ name: 'profissao_conjuge', "type": 'int', "default": 1 })
  profissaoConjuge: number;

  @Column({ name: 'grau_academico_pai', "type": 'int', "default": 1 })
  grauAcademicoPai: number;

  @Column({ name: 'grau_academico_mae', "type": 'int', "default": 1 })
  grauAcademicoMae: number;

  @Column({ name: 'grau_academico_conjuge', "type": 'int', "default": 1 })
  grauAcademicoConjuge: number;

  @Column({ name: 'codigo_provincia_residencia_permanente', "type": 'int', "default": 1 })
  codigoProvinciaResidenciaPermanente: number;

  @Column({ name: 'codigo_provincia_naturalidade', "type": 'int', "default": 1 })
  codigoProvinciaNaturalidade: number;

  @Column({ name: 'codigo_tipo_candidatura', "type": 'int', "default": 1 })
  codigo_tipo_candidatura: number;

  @Column({ name: 'codigo_forma_ingresso', "type": 'int', "default": 1 })
  codigoFormaIngresso: number;

  @Column({ name: 'codigo_curso_pagamento', "type": 'int', "nullable": true })
  codigoCursoPagamento: number | null;

  @Column({ name: 'codigo_municipio', "type": 'int', "nullable": true })
  codigoMunicipio: number | null;

  // ---------- Dados pessoais ----------
  @Column({ name: 'Bilhete_Identidade', "type": 'varchar', "length": 50 })
  Bilhete_Identidade: string;

  @Column({ name: 'Numero_Identificacao_Fiscal', "type": 'varchar', "length": 60, "nullable": true })
  Numero_Identificacao_Fiscal: string | null;

  @Column({ name: 'Sexo', "type": 'varchar', "length": 45, "nullable": true })
  Sexo: string | null;

  @Column({ name: 'Data_Nascimento', "type": 'date', "nullable": true })
  Data_Nascimento: Date | null;

  @Column({ name: 'Estado_Civil', "type": 'varchar', "length": 45, "nullable": true })
  Estado_Civil: string | null;

  @Column({ name: 'Contactos_Telefonicos', "type": 'varchar', "length": 100, "nullable": true })
  Contactos_Telefonicos: string | null;

  @Column({ name: 'contacto_de_emergencia', "type": 'varchar', "length": 30, "nullable": true })
  contacto_de_emergencia: string | null;

  @Column({ name: 'Morada_Completa', "type": 'varchar', "length": 550, "nullable": true })
  Morada_Completa: string | null;

  @Column({ name: 'Email', "type": 'varchar', "length": 455, "nullable": true })
  Email: string | null;

  @Column({ name: 'Nome_Pessoa_Contacto_Telefone', "type": 'varchar', "length": 250, "nullable": true })
  Nome_Pessoa_Contacto_Telefone: string | null;

  @Column({ name: 'Data_Conclusao', "type": 'date', "nullable": true })
  Data_Conclusao: Date | null;

  // FLOAT → NUMBER(10,2)
  @Column({ name: 'Media_Final', "type": 'number', "precision": 10, "scale": 2, "nullable": true })
  Media_Final: number | null;

  @Column({ name: 'Numero_Ordem_Medicos', "type": 'varchar', "length": 70, "nullable": true })
  Numero_Ordem_Medicos: string | null;

  @Column({ name: 'Instituicao_Exerce_Funcao', "type": 'varchar', "length": 250, "nullable": true })
  Instituicao_Exerce_Funcao: string | null;

  @Column({ name: 'Data_Inicio_Trabalho', "type": 'date', "nullable": true })
  Data_Inicio_Trabalho: Date | null;

  @Column({ name: 'data_emissao_bi', "type": 'date', "nullable": true })
  data_emissao_bi: Date | null;

  @Column({ name: 'data_validade_bi', "type": 'date', "nullable": true })
  data_validade_bi: Date | null;

  // Era varchar mas parece data → mantive varchar (conforme original)
  @Column({ name: 'data_preescrincao', "type": 'varchar', "length": 50, "nullable": true })
  data_preescrincao: string | null;

  @Column({ name: 'data_ultima_actualizacao', "type": 'varchar', "length": 50, "nullable": true })
  data_ultima_actualizacao: string | null;

  @Column({ name: 'Pai', "type": 'varchar', "length": 250, "nullable": true })
  Pai: string | null;

  @Column({ name: 'Mae', "type": 'varchar', "length": 250, "nullable": true })
  Mae: string | null;

  @Column({ name: 'Naturalidade', "type": 'varchar', "length": 250, "default": 'Nao definido' })
  Naturalidade: string;

  @Column({ name: 'Instituicao_Formacao', "type": 'varchar', "length": 250, "nullable": true })
  Instituicao_Formacao: string | null;

  @Column({ name: 'provincia_origem', "type": 'varchar', "length": 45, "nullable": true })
  provincia_origem: string | null;

  @Column({ name: 'estado', "type": 'int', "default": 0 })
  estado: number;

  // TINYINT → NUMBER(1,0) + boolean
  @Column({ name: 'Deslocado_Permanente', "type": 'number', "precision": 1, "scale": 0, "default": 0 })
  Deslocado_Permanente: boolean;

  // ENUM → VARCHAR(10)
  @Column({ name: 'AlunoCacuaco', "type": 'varchar', "length": 10, "default": 'NAO' })
  AlunoCacuaco: 'SIM' | 'NAO';

  @Column({ name: 'curso_ensino_medio', "type": 'varchar', "length": 145, "nullable": true })
  curso_ensino_medio: string | null;

  // ---------- Dados financeiros ----------
  @Column({ name: 'desconto', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  desconto: number;

  @Column({ name: 'saldo', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  saldo: number;

  @Column({ name: 'saldo_anterior', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  saldo_anterior: number;

  // TEXT → CLOB
  @Column({ name: 'obs_saldo', "type": 'clob', "nullable": true })
  obs_saldo: string | null;

  @Column({ name: 'obs_desconto', "type": 'clob', "nullable": true })
  obs_desconto: string | null;

  @Column({ name: 'saldo_reset', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  saldo_reset: number;

  @Column({ name: 'saldo_reset_anter', "type": 'number', "precision": 15, "scale": 2, "default": 0 })
  saldo_reset_anter: number;

  // ---------- Flags / Status ----------
  @Column({ name: 'codigo_validacao_email', "type": 'varchar', "length": 45, "nullable": true })
  codigo_validacao_email: string | null;

  @Column({ name: 'estado_atualizacao_email', "type": 'int', "default": 0 })
  estado_atualizacao_email: number;

  // ENUM → VARCHAR(10)
  @Column({ name: 'permitir_inscricao', "type": 'varchar', "length": 10, "nullable": true })
  permitir_inscricao: 'NAO' | 'SIM' | null;

  @Column({ name: 'isencao_multa', "type": 'varchar', "length": 10, "nullable": true })
  isencao_multa: 'NAO' | 'SIM' | null;

  @Column({ name: 'estado_preiscricao_candidato', "type": 'varchar', "length": 10, "default": 'ACTIVO' })
  estado_preiscricao_candidato: 'ACTIVO' | 'INACTIVO';

  // ---------- Datas ----------
  @Column({ name: 'created_at', "type": 'timestamp', "nullable": true })
  created_at: Date | null;

  // Update sem default/onUpdate
  @Column({ name: 'updated_at', "type": 'timestamp', "nullable": true })
  updated_at: Date | null;
}
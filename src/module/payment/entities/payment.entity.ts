import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from 'src/common/base-entity';

@Entity({ name: 'FK2_TB_PAGAMENTOS' })
export class Payment extends BaseEntity {

  /* =======================
     IDENTIFICAÇÃO
  ======================== */


    @PrimaryGeneratedColumn({ name: 'CODIGO' })  
  codigo: number;


  /* =======================
     DATAS
  ======================== */

  @Column({ name: 'DATA', type: 'timestamp' })
  data: Date;

  @Column({ name: 'DATABANCO', type: 'timestamp', nullable: true })
  dataBanco?: Date;

  @Column({ name: 'DATAREGISTO', type: 'timestamp', nullable: true })
  dataRegisto?: Date;

  @Column({ name: 'DATA_OPERACAO', type: 'timestamp', nullable: true })
  dataOperacao?: Date;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp', nullable: true })
  updatedAt: Date;


  /* =======================
     INFORMAÇÕES BANCÁRIAS
  ======================== */

  @Column({ name: 'N_OPERACAO_BANCARIA', type: 'varchar2', length: 25, nullable: true, unique: true })
  nOperacaoBancaria?: string;

  @Column({ name: 'N_OPERACAO_BANCARIA2', type: 'varchar2', length: 25, nullable: true })
  nOperacaoBancaria2?: string;

  @Column({ name: 'CONTAMOVIMENTADA', type: 'number', nullable: true })
  contaMovimentada?: number;

  @Column({ name: 'VALOR_DEPOSITADO', type: 'number', precision: 15, scale: 2 })
  valorDepositado: number;


  /* =======================
     INFORMAÇÕES ACADÉMICAS
  ======================== */

  @Column({ name: 'ANOLECTIVO', type: 'number' })
  anoLectivo: number;

  @Column({ name: 'CODIGO_PREINSCRICAO'})
  codigoPreInscricao?: number;

  @Column({ name: 'CODIGO_FACTURA', type: 'number', nullable: true })
  codigoFactura?: number;


  /* =======================
     VALORES
  ======================== */

  @Column({ name: 'TOTALGERAL', type: 'number', precision: 15, scale: 2, nullable: true })
  totalGeral?: number;


  /* =======================
     PAGAMENTO
  ======================== */

  @Column({ name: 'FORMA_PAGAMENTO', type: 'varchar2', length: 45, nullable: true })
  formaPagamento?: string;

  @Column({
    name: 'TIPO_PAGAMENTO',
    type: 'varchar2',
    length: 10,
    default: 'NORMAL',
    comment: 'BOLSA ou NORMAL',
  })
  tipoPagamento: 'BOLSA' | 'NORMAL';

  @Column({
    name: 'STATUS_PAGAMENTO',
    type: 'varchar2',
    length: 15,
    default: 'pendente',
    comment: 'pendente ou concluido',
  })
  statusPagamento: 'pendente' | 'concluido';

  @Column({
    name: 'FEITO_COM_RESERVA',
    type: 'varchar2',
    length: 1,
    default: 'N',
    comment: 'Y ou N',
  })
  feitoComReserva: 'Y' | 'N';


  /* =======================
     CONTROLO
  ======================== */

  @Column({ name: 'ESTADO', type: 'number', default: 0 })
  estado: number;

  @Column({ name: 'STATUSMOVIMENTO', type: 'number', default: 0 })
  statusMovimento: number;

  @Column({ name: 'CORRENTE', type: 'number', default: 1 })
  corrente: number;

  @Column({ name: 'CANAL', type: 'number', default: 3 })
  canal: number;

  @Column({ name: 'CAIXA_ID', type: 'number', default: 0 })
  caixaId: number;

  @Column({ name: 'INSTITUICAO_ID', type: 'number', nullable: true })
  instituicaoId?: number;


  /* =======================
     UTILIZADOR
  ======================== */

  @Column({ name: 'UTILIZADOR', type: 'number', nullable: true })
  utilizador?: number;

  @Column({ name: 'FK_UTILIZADOR', type: 'number', nullable: true })
  fkUtilizador?: number;


  /* =======================
     DOCUMENTOS
  ======================== */

  @Column({ name: 'NOME_DOCUMENTO', type: 'varchar2', length: 450, nullable: true })
  nomeDocumento?: string;

  @Column({ name: 'NOME_DOCUMENTO2', type: 'varchar2', length: 450, nullable: true })
  nomeDocumento2?: string;

  @Column({ name: 'INFO_ADICIONAL', type: 'varchar2', length: 100, nullable: true })
  infoAdicional?: string;

  @Column({ name: 'OBSERVACAO', type: 'varchar2', length: 1000, nullable: true })
  observacao?: string;

}
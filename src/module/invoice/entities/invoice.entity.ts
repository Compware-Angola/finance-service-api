import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// Esta classe representa a tabela 'factura' no banco de dados.
@Entity('factura')
export class Invoice {

    // Chave Primária, AUTO_INCREMENT
    @PrimaryGeneratedColumn({ name: 'Codigo', type: 'int', unsigned: true })
    Codigo: number;

    // Data da Fatura (DATETIME)
    @Column({ name: 'DataFactura', type: 'datetime' })
    DataFactura: Date;

    // Valores Monetários (DOUBLE) - Total Preço
    @Column({ name: 'TotalPreco', type: 'double', default: 0 })
    TotalPreco: number;

    // Chave Estrangeira (Matrícula) - UNSIGNED INT
    @Column({ name: 'CodigoMatricula', type: 'int', unsigned: true, nullable: true })
    CodigoMatricula: number | null;

    // Referência de Pagamento (VARCHAR 9)
    @Column({ name: 'Referencia', type: 'varchar', length: 9, default: '000000000' })
    Referencia: string;

    // Descontos e outros valores
    @Column({ name: 'Desconto', type: 'double', default: 0 })
    Desconto: number;
    
    @Column({ name: 'Troco', type: 'double', default: 0 })
    Troco: number;
    
    @Column({ name: 'totalIVA', type: 'double', default: 0 })
    totalIVA: number;

    @Column({ name: 'TotalMulta', type: 'double', default: 0 })
    TotalMulta: number;

    @Column({ name: 'total_incidencia', type: 'double', default: 0 })
    totalIncidencia: number; // Mapeado para camelCase

    @Column({ name: 'total_retencao', type: 'double', default: 0 })
    totalRetencao: number; // Mapeado para camelCase

    @Column({ name: 'ValorAPagar', type: 'double', default: 0 })
    ValorAPagar: number;

    @Column({ name: 'ValorEntregue', type: 'double', default: 0 })
    ValorEntregue: number;

    // Valor por Extenso (VARCHAR 255)
    @Column({ name: 'ValorAPagarExtenso', type: 'varchar', length: 255, default: '0', collation: 'latin1_swedish_ci', nullable: true })
    ValorAPagarExtenso: string | null;
    
    @Column({ name: 'Descricao', type: 'varchar', length: 500, nullable: true })
    Descricao: string | null;

    @Column({ name: 'ValorEntregueMltCX', type: 'double', default: 0, nullable: true })
    ValorEntregueMltCX: number | null;

    @Column({ name: 'codigo_descricao', type: 'int', unsigned: true, nullable: true })
    codigoDescricao: number | null; // Mapeado para camelCase

    // Numeração e Hash
    @Column({ name: 'NextFactura', type: 'varchar', length: 45, default: '' })
    NextFactura: string;

    @Column({ name: 'next', type: 'varchar', length: 45, default: '' })
    next: string;

    @Column({ name: 'texto_hash', type: 'longtext', nullable: true })
    textoHash: string | null; // Mapeado para camelCase

    @Column({ name: 'dataVencimento', type: 'date', nullable: true })
    dataVencimento: Date | null;

    // Chave Estrangeira (Polo)
    @Column({ name: 'polo_id', type: 'bigint', unsigned: true })
    poloId: number; // Mapeado para camelCase

    @Column({ name: 'obs', type: 'varchar', length: 45000, nullable: true })
    obs: string | null;

    @Column({ name: 'hashValor', type: 'varchar', length: 255, collation: 'latin1_swedish_ci', nullable: true })
    hashValor: string | null;

    @Column({ name: 'contaCorrente', type: 'varchar', length: 45, nullable: true })
    contaCorrente: string | null;

    @Column({ name: 'faturaReference', type: 'varchar', length: 45, nullable: true })
    faturaReference: string | null;

    // Canal
    @Column({ name: 'canal', type: 'int', unsigned: true, default: 3 })
    canal: number;

    // Ano Lectivo
    @Column({ name: 'ano_lectivo', type: 'int', unsigned: true, default: 1 })
    anoLectivo: number;

    // Estado (1-Validado, 2-Pendente, 3-Anulada)
    @Column({ name: 'estado', type: 'int', unsigned: true, default: 0, comment: '1-Validado, 2-Pendente(pag parcial), 3-anulada' })
    estado: number;

    @Column({ name: 'corrente', type: 'int', unsigned: true, default: 1 })
    corrente: number;

    @Column({ name: 'codigo_preinscricao', type: 'int', unsigned: true, nullable: true })
    codigoPreinscricao: number | null; // Mapeado para camelCase

    // Numeração sequencial usada para o Hash Fiscal
    @Column({ name: 'numSequenciaFactura', type: 'int', unsigned: true, nullable: true })
    numSequenciaFactura: number | null; // Mapeado para camelCase

    @Column({ name: 'tipo_documento_factura_id', type: 'int', unsigned: true, nullable: true })
    tipoDocumentoFacturaId: number | null; // Mapeado para camelCase

    // NOTA: As chaves estrangeiras (Constraints) são definidas em outras entidades
    // usando @ManyToOne e @OneToMany. Para simplificar, mantivemos apenas as colunas aqui.
}

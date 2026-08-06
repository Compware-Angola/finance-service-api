import { Invoice } from 'src/module/invoice/entities/invoice.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({
    name: 'FK2_TB_RECONCILIACAO_NEGOCIACAO_DIVIDA',
})
export class ReconciliacaoNegociacaoDivida {
    @PrimaryGeneratedColumn({
        name: 'CODIGO',
        type: 'number',
    })
    id: number;


    @ManyToOne(() => Invoice)
    @JoinColumn({
        name: 'FACTURA_ORIGINAL',
    })
    facturaOriginal: Invoice;


    @ManyToOne(() => Invoice)
    @JoinColumn({
        name: 'FACTURA_PROPOSTA_ALTERACAO',
    })
    facturaPropostaAlteracao: Invoice;


    @Column({
        name: 'DESCRICAO_CRIACAO',
        type: 'varchar2',
        length: 500,
        nullable: true,
    })
    descricaoCriacao: string;


    @Column({
        name: 'DESCRICAO_VALIDACAO',
        type: 'varchar2',
        length: 500,
        nullable: true,
    })
    descricaoValidacao: string;


    @Column({
        name: 'STATUS',
        type: 'varchar2',
        length: 30,
    })
    status: string;


    @CreateDateColumn({
        name: 'CREATED_AT',
        type: 'timestamp',
    })
    createdAt: Date;


    @UpdateDateColumn({
        name: 'UPDATED_AT',
        type: 'timestamp',
    })
    updatedAt: Date;


    @Column({
        name: 'CREATED_BY',
        type: 'number',
    })
    createdBy: number;


    @Column({
        name: 'VALIDATED_BY',
        type: 'number',
        nullable: true,
    })
    validatedBy: number;


    @Column({
        name: 'VALIDATED_AT',
        type: 'timestamp',
        nullable: true,
    })
    validatedAt: Date;
}
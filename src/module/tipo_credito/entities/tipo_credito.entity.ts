import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('FK2_TB_TIPO_CREDITO')
export class TipoCredito {
    @PrimaryColumn({ name: 'CODIGO', type: 'number' })
    codigo: number
    @Column({ name: 'DESIGNACAO', type: 'varchar2', length: 100 })
    designacao: string
    @Column({ name: 'CREATED_AT', type: 'timestamp', nullable: true })
    createdAt?: Date
    @Column({ name: 'DELETED_AT', type: 'timestamp', nullable: true })
    deleteAt?: Date
    @Column({ name: 'UPDATED_AT', type: 'timestamp', nullable: true })
    updatedAt?: Date
    @Column({ name: 'SIGLA', type: 'varchar2', length: 10 })
    sigla: string
    @Column({ name: 'STATUS', type: 'number' })
    status: number
}

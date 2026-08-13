import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

@Entity('FK2_TB_FORMA_PAGAMENTO')
export class FormaPagamentoEntity {
  @ApiProperty({
    example: 1,
    description: 'Código da forma de pagamento',
  })
  @PrimaryColumn({
    name: 'CODIGO',
    type: 'number',
  })
  codigo: number;

  @ApiProperty({
    example: 'TPA',
    description: 'Descrição da forma de pagamento',
  })
  @Column({
    name: 'DESCRICAO',
    type: 'varchar2',
    length: 100,
  })
  descricao: string;

  @ApiProperty({
    example: 1,
    description: 'Status da forma de pagamento',
  })
  @Column({
    name: 'STATUS_',
    type: 'number',
    precision: 1,
  })
  status: number;
}

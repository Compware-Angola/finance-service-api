import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateFormaPagamentoDto {
  @ApiProperty({
    example: 'TRANSFERENCIA',
    description: 'Descrição da forma de pagamento',
  })
  @IsString({
    message: 'Descrição inválida',
  })
  @IsNotEmpty({
    message: 'Descrição obrigatória',
  })
  @MaxLength(100)
  descricao: string;

  @ApiProperty({
    example: 1,
    description: 'Status da forma de pagamento',
  })
  @IsInt({
    message: 'Status inválido',
  })
  status: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn } from 'class-validator';

export class UpdateStatusFormaPagamentoDto {
  @ApiProperty({
    example: 1,
    description: 'Status da forma de pagamento',
    enum: [0, 1],
  })
  @IsInt({
    message: 'Status inválido',
  })
  @IsIn([0, 1], {
    message: 'Status deve ser 0 ou 1',
  })
  status: number;
}

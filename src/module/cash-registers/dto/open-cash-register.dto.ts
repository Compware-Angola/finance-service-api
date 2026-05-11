import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class OpenCashRegisterDto {
  @ApiProperty({
    type: Number,
    example: 21400,
    description: 'Código do operador',
    required: true,
  })
  @IsInt()
  operatorId: number;
}

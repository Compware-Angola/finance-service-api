import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CashRegisterSummaryDto {
  @ApiProperty({
    description: 'Caixa',
    example: 3,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  caixaId: number;

  @ApiProperty({
    description: 'Operador',
    example: 2433,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  operadorId: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class OpenCashRegisterDto {
  @ApiPropertyOptional({
    example: 5000,
    description: 'Valor inicial de abertura do caixa',
    default: 0,
  })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: 'O valor de abertura deve ser numérico',
    },
  )
  @Min(0, {
    message: 'O valor de abertura não pode ser negativo',
  })
  openingAmount?: number = 0;
}

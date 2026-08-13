import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @Type(() => Number)
  openingAmount?: number = 0;

  @ApiProperty({
    example: 1,
    description: 'ID do utilizador responsável',
  })
  @IsNumber(
    {},
    {
      message: 'O ID do utilizador deve ser numérico',
    },
  )
  @Min(0, {
    message: 'O ID do utilizador não pode ser negativo',
  })
  @Type(() => Number)
  operatorId: number;
}

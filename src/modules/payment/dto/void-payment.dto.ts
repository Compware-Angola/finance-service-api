import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class VoidPaymentDTO {
  @ApiProperty({
    description: 'Código do pagamento a ser anulado',
    example: 10234,
  })
  @IsInt()
  @Type(() => Number)
  codigoPagamento: number;

  @ApiPropertyOptional({
    description: 'Motivo da anulação',
    example: 'Pagamento realizado em duplicado',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}

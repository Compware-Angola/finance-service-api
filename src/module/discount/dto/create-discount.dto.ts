import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDiscountDto {
  @ApiProperty({ description: 'Descrição do desconto' })
  @IsNotEmpty()
  @IsString()
  descricao: string;

  @ApiProperty({ description: 'Taxa do desconto' })
  @IsNotEmpty()
  @IsNumber()
  taxa: number;

  @ApiProperty({ description: 'Data de início', example: '2024-01-01' })
  @IsNotEmpty()
  @IsDateString()
  data_inicio: string;

  @ApiProperty({ description: 'Data de fim', example: '2024-12-31' })
  @IsNotEmpty()
  @IsDateString()
  data_fim: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsOptional()
  @IsString()
  obs?: string;

  @ApiProperty({
    description: 'Estado (ativo/inativo)',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}

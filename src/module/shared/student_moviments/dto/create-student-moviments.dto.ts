import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentMovimentDTO {
  @ApiProperty({
    description: 'Referência do movimento',
    example: 'MOV-001',
  })
  @IsNotEmpty()
  @IsString()
  referencia: string;

  @ApiProperty({
    description: 'Valor de Apagar',
    example: 50000,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  valor: number;

  @ApiPropertyOptional({
    description: 'Valor de Apagar',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorFactura?: number;

  @ApiProperty({
    description: 'debito/credito',
    example: 0,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  tipoOperacao: number;

  @ApiProperty({
    description: 'Estado do movimento',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  estado: number;

  @ApiProperty({
    description: 'Código da matrícula do aluno',
    example: 12345,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  matricula: number;

  @ApiProperty({
    description: 'Sigla do tipo de movimento',
    example: 1,
  })
  @IsNotEmpty()
  @IsString()
  siglaTipoMovimento: string;

  @ApiPropertyOptional({
    description: 'Código do motivo do movimento',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoMotivo?: number;

  @ApiPropertyOptional({
    description: 'Código do utilizador responsável pelo movimento',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoUtilizador?: number;

  @ApiPropertyOptional({
    description: 'Observação do movimento',
    example: 'Pagamento de mensalidade',
  })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({
    description: 'Código da factura associada',
    example: 10001,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  factura?: number;

  @ApiPropertyOptional({
    description: 'Referência do utilizador',
    example: 'USR001',
  })
  @IsOptional()
  @IsString()
  refUtilizador?: string;
}

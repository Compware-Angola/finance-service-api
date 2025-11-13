import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  IsEnum,
  Length,
  Matches,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
@ApiProperty({
    description: 'Data do pagamento no formato AAAA-MM-DD (ISO 8601)',
    example: '2025-11-05',
  })
  @IsString({ message: 'Data deve ser uma string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { 
    message: 'Data deve estar no formato AAAA-MM-DD',
  })
  Data: string;

  @ApiPropertyOptional({
    description: 'Número da operação bancária (único)',
    example: 'OP123456789',
  })
  @IsOptional()
  @IsString()
  @Length(1, 25)
  N_Operacao_Bancaria?: string;

  @ApiPropertyOptional({
    description: 'Segundo número de operação bancária (opcional)',
    example: 'OP987654321',
  })
  @IsOptional()
  @IsString()
  @Length(1, 25)
  N_Operacao_Bancaria2?: string;

  @ApiPropertyOptional({
    description: 'Observação sobre o pagamento',
    example: 'Pagamento via Multicaixa Express',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  Observacao?: string;

  @ApiProperty({
    description: 'Ano letivo do pagamento',
    example: 2025,
  })
  @IsInt()
  @IsPositive()
  AnoLectivo: number;

  @ApiPropertyOptional({
    description: 'Total geral do pagamento (se aplicável)',
    example: 150000.00,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  Totalgeral?: number;

  @ApiPropertyOptional({
    description: 'Data da operação no banco (ISO string)',
    example: '2025-11-05T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  DataBanco?: string;

  @ApiPropertyOptional({
    description: 'Código da pré-inscrição associada',
    example: 123,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  Codigo_PreInscricao?: any;

  @ApiPropertyOptional({
    description: 'Forma de pagamento',
    example: 'Multicaixa',
    enum: ['Multicaixa', 'Transferência', 'Numerário', 'TPA', 'Online'],
  })
  @IsOptional()
  @IsString()
  @Length(1, 45)
  forma_pagamento?: string;

  @ApiProperty({
    description: 'Valor depositado (obrigatório)',
    example: 50000.00,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor_depositado: number;

  @ApiPropertyOptional({
    description: 'ID da conta movimentada',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  ContaMovimentada?: number;

  @ApiPropertyOptional({
    description: 'ID do utilizador que registrou',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  Utilizador?: number;

  @ApiPropertyOptional({
    description: 'Data de registo (ISO string)',
    example: '2025-11-05T08:45:00Z',
  })
  @IsOptional()
  @IsDateString()
  DataRegisto?: string;

  @ApiPropertyOptional({
    description: 'Canal do pagamento',
    example: 3,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  canal?: number;

  @ApiPropertyOptional({
    description: 'Nome do documento comprovativo (ex: recibo.pdf)',
    example: 'recibo_123.pdf',
  })
  @IsOptional()
  @IsString()
  @Length(1, 450)
  nome_documento?: string;

  @ApiPropertyOptional({
    description: 'Nome do segundo documento (se houver)',
    example: 'comprovativo_extra.jpg',
  })
  @IsOptional()
  @IsString()
  @Length(1, 450)
  nome_documento2?: string;

  @ApiPropertyOptional({
    description: 'Estado do pagamento',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  estado?: number;

  @ApiProperty({
    description: 'Tipo de pagamento: BOLSA ou NORMAL',
    enum: ['BOLSA', 'NORMAL'],
    default: 'NORMAL',
  })
  @IsEnum(['BOLSA', 'NORMAL'])
  tipo_pagamento: 'BOLSA' | 'NORMAL';

  @ApiPropertyOptional({
    description: 'Código da factura associada',
    example: 987,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigo_factura?: any;

  @ApiPropertyOptional({
    description: 'ID da instituição',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  instituicao_id?: number;

  @ApiPropertyOptional({
    description: 'ID da caixa (se aplicável)',
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  caixa_id?: number;

  @ApiProperty({
    description: 'Status do pagamento no Mutue Cash',
    enum: ['pendente', 'concluido'],
    default: 'pendente',
  })
  @IsEnum(['pendente', 'concluido'])
  status_pagamento: 'pendente' | 'concluido';

  @ApiPropertyOptional({
    description: 'Data da operação (ISO string)',
    example: '2025-11-05T11:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  data_operacao?: string;

  @ApiPropertyOptional({
    description: 'Status do movimento',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  statusMovimento?: number;

  @ApiPropertyOptional({
    description: 'Informação adicional',
    example: 'Pagamento parcial',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  info_adicional?: string;

  @ApiPropertyOptional({
    description: 'Indica se é corrente (1 = sim, 0 = não)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  corrente?: number;

  @ApiPropertyOptional({
    description: 'ID do utilizador relacionado (FK)',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  fk_utilizador?: number;

  @ApiProperty({
    description: 'Indica se foi feito com reserva',
    enum: ['Y', 'N'],
    default: 'N',
  })
  @IsEnum(['Y', 'N'])
  feito_com_reserva: 'Y' | 'N';
}
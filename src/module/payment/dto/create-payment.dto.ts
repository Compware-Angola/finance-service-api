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
    description: 'Data do pagamento (AAAA-MM-DD)',
    example: '2025-11-05',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data: string;

  @ApiPropertyOptional({ example: 'OP123456789' })
  @IsOptional()
  @IsString()
  @Length(1, 25)
  nOperacaoBancaria?: string;



  @ApiPropertyOptional({ example: 'Pagamento via Multicaixa Express' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  observacao?: string;


  @ApiPropertyOptional({ example: 150000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalGeral?: number;

  @ApiPropertyOptional({ example: '2025-11-05T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  dataBanco?: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigoPreInscricao?: number;

  @ApiPropertyOptional({ example: 'Multicaixa' })
  @IsOptional()
  @IsString()
  @Length(1, 45)
  formaPagamento?: string;

  @ApiProperty({ example: 50000.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valorDepositado: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  contaMovimentada?: number;


  @ApiPropertyOptional({ example: '2025-11-05T08:45:00Z' })
  @IsOptional()
  @IsDateString()
  dataRegisto?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  canal?: number;

  @ApiPropertyOptional({ example: 'recibo_123.pdf' })
  @IsOptional()
  @IsString()
  @Length(1, 450)
  nomeDocumento?: string;

  @ApiPropertyOptional({ example: 'extra.jpg' })
  @IsOptional()
  @IsString()
  @Length(1, 450)
  nomeDocumento2?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  estado?: number;

  @ApiProperty({
    enum: ['BOLSA', 'NORMAL'],
    default: 'NORMAL',
  })
  @IsEnum(['BOLSA', 'NORMAL'])
  tipoPagamento: 'BOLSA' | 'NORMAL';

  @ApiPropertyOptional({ example: 987 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigoFactura?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  instituicaoId?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  caixaId?: number;

  @ApiProperty({
    enum: ['pendente', 'concluido'],
    default: 'pendente',
  })
  @IsEnum(['pendente', 'concluido'])
  statusPagamento: 'pendente' | 'concluido';

  @ApiPropertyOptional({ example: '2025-11-05T11:00:00Z' })
  @IsOptional()
  @IsDateString()
  dataOperacao?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  statusMovimento?: number;

  @ApiPropertyOptional({ example: 'Pagamento parcial' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  infoAdicional?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  corrente?: number;



  @ApiProperty({
    enum: ['Y', 'N'],
    default: 'N',
  })
  @IsEnum(['Y', 'N'])
  feitoComReserva: 'Y' | 'N';

    @ApiProperty({
    description: 'Ano letivo do pagamento',
    example: 23,
  })
  @IsInt()
  @IsPositive()
  anoLectivo: number;
}
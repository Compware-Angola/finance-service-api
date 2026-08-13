import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsPositive,
  Min,
  IsInt,
  ValidateNested,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceItemDto } from './create-invoice-itens.dto';

export class CreateInvoiceDto {
  // --------------------------------------------------------------------------------
  // CAMPOS PRINCIPAIS
  // --------------------------------------------------------------------------------

  @ApiProperty({
    description: 'Data e hora de emissão da fatura.',
    type: String,
    format: 'date-time',
    example: '2025-10-24T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  DataFactura: string;

  @ApiProperty({
    description: 'ID do Polo (Unidade) ao qual a fatura pertence.',
    type: Number,
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  polo_id: number;

  @ApiProperty({
    description: 'Valor total da fatura.',
    type: Number,
    example: 15000.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  TotalPreco: number;

  @ApiProperty({
    description:
      'Código da descrição (opcional, "usado" em contextos específicos).',
    type: Number,
    required: false,
    example: 101,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  codigo_descricao?: number;

  @ApiProperty({
    description: 'Valor a pagar após descontos, "reten"ções e incidências.',
    type: Number,
    required: false,
    example: 13000.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ValorAPagar?: number;

  @ApiProperty({
    description: 'Total de incidência tributária aplicada.',
    type: Number,
    required: false,
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  total_incidencia?: number;

  @ApiProperty({
    description: 'Total de retenção na fonte.',
    type: Number,
    required: false,
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  total_retencao?: number;

  // --------------------------------------------------------------------------------
  // RELACIONAMENTOS
  // --------------------------------------------------------------------------------

  @ApiProperty({
    description: 'ID da Matrícula relacionada.',
    type: Number,
    required: false,
    example: 1002,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  CodigoMatricula?: number;

  @ApiProperty({
    description: 'ID da Pré-Inscrição relacionada.',
    type: Number,
    required: false,
    example: 501,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigo_preinscricao?: number;

  @ApiProperty({
    description: 'ID tipo de candidatura.',
    type: Number,
    required: false,
    example: 501,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigo_tipo_candidatura?: number;
  // --------------------------------------------------------------------------------
  // DETALHES FINANCEIROS
  // --------------------------------------------------------------------------------

  @ApiProperty({
    description: 'Valor do Desconto aplicado.',
    type: Number,
    required: false,
    default: 0,
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  Desconto?: number = 0;

  @ApiProperty({
    description: 'Valor total do IVA.',
    type: Number,
    required: false,
    default: 0,
    example: 2700.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalIVA?: number = 0;

  @ApiProperty({
    description: 'Valor total de Multas.',
    type: Number,
    required: false,
    default: 0,
    example: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  TotalMulta?: number = 0;

  @ApiProperty({
    description: 'Descrição geral da fatura.',
    type: String,
    required: false,
    maxLength: 500,
    example: 'Pagamento da propina referente ao mês de Outubro.',
  })
  @IsOptional()
  @IsString()
  Descricao?: string;

  @ApiProperty({
    description: 'ID do tipo de documento de faturação.',
    type: Number,
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  tipo_documento_factura_id?: number;

  @ApiProperty({
    description: 'Canal de comunicação (3 é o padrão).',
    type: Number,
    required: false,
    default: 3,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  canal?: number = 3;
  @ApiProperty({
    description: 'Ano lectivo.',
    type: Number,
    example: 1023,
  })
  @IsOptional()
  @IsInt()
  codigo_anoLectivo?: number;

  // --------------------------------------------------------------------------------
  // ITENS DA FATURA (ARRAY)
  // --------------------------------------------------------------------------------

  @ApiProperty({
    description: 'Lista de itens ou serviços incluídos na fatura.',
    type: [InvoiceItemDto],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  itens?: InvoiceItemDto[]; // Removido o ? para reforçar obrigatoriedade (conforme @ArrayMinSize(1))
}

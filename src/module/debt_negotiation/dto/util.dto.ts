import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MensalidadeItemDto {
  @ApiProperty({
    description: 'ID temporário do mês (e.g., 260).',
    required: false,
    type: Number,
    example: 260,
  })
  @IsInt()
  @IsOptional()
  mes_temp_id: number;

  @ApiProperty({
    description: 'Mês da propina (e.g., "2024-02-01 a 2024-02-29").',
    example: "2024-02",
  })
  @IsString()
  mes: string;

  @ApiProperty({
    description: 'Valor em string formatada (e.g., "46000.00").',
    example: "46000.00",
  })
  @IsString()
  valor: string;

  @ApiProperty({
    description: 'Valor da multa.',
    type: Number,
    example: 1500.00,
  })
  @IsNumber()
  multa: number;

  @ApiProperty({
    description: 'Total do item.',
    type: Number,
    example: 47500.00,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Descrição do serviço (e.g., "Propina Fisioterapia").',
    example: "Propina Fisioterapia",
  })
  @IsString()
  servico: string;

  @ApiProperty({
    description: 'Ano letivo (e.g., "2023-2024").',
    example: 23,
  })
  @IsInt()
  ano_lectivo: number;

  @ApiProperty({
    description: 'Taxa de desconto.',
    type: Number,
    example: 10.00,
  })
  @IsNumber()
  desconto: number;

  @ApiProperty({
    description: 'Incidência.',
    type: Number,
    example: 46000.00,
  })
  @IsNumber()
  incidencia: number;

  @ApiProperty({
    description: 'Valor do IVA.',
    type: Number,
    example: 0.00,
  })
  @IsNumber()
  valor_iva: number;

  @ApiProperty({
    description: 'Tipo de taxas.',
    type: Number,
    example: 1,
  })
  @IsInt()
  tipo_taxas: number;

  @ApiProperty({
    description: 'Código da factura.',
    type: Number,
    required: false,
    example: 987654,
  })
  @IsInt()
  @IsOptional()
  codigo_factura?: number;

  @ApiProperty({
    description: 'Observação.',
    type: String,
    example: "Mensalidade",
  })
  @IsString()
  @IsOptional()
  obs?: string;
}

// === ITEM DE SERVIÇO ===
export class ServicoItemDto {
  @ApiProperty({
    description: 'Código da Grade Curricular (e.g., 668).',
    type: Number,
    example: 668,
  })
  @IsInt()
  codgradecurricular: number;

  @ApiProperty({
    description: 'Código da Factura Outros Serviços (e.g., 586248).',
    type: Number,
    example: 586248,
  })
  @IsInt()
  codfacturaoutrosservicos: number;

  @ApiProperty({
    description: 'Código do Serviço (e.g., "11739").',
    example: "11739",
  })
  @IsString()
  codidigo_servico: string;

  @ApiProperty({
    description: 'Código do ano letivo (e.g., 23).',
    example: 23,
  })
  @IsInt()
  ano_lectivo: number;

  @ApiProperty({
    description: 'Valor do serviço.',
    type: Number,
    example: 35000.00,
  })
  @IsNumber()
  valor: number;

  @ApiProperty({
    description: 'Valor da multa.',
    type: Number,
    example: 0.00,
  })
  @IsNumber()
  multa: number;

  @ApiProperty({
    description: 'Total do item.',
    type: Number,
    example: 35000.00,
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    description: 'Taxa de multa.',
    type: Number,
    example: 5.00,
  })
  @IsNumber()
  taxa_multa: number;

  @ApiProperty({
    description: 'Taxa de desconto.',
    type: Number,
    example: 0.00,
  })
  @IsNumber()
  taxa_desconto: number;

  @ApiProperty({
    description: 'Valor do desconto.',
    type: Number,
    example: 0.00,
  })
  @IsNumber()
  desconto: number;

  @ApiProperty({
    description: 'Incidência.',
    type: Number,
    example: 35000.00,
  })
  @IsNumber()
  incidencia: number;

  @ApiProperty({
    description: 'Valor do IVA.',
    type: Number,
    example: 1750.00,
  })
  @IsNumber()
  valor_iva: number;
  @ApiProperty({
    description: 'Observação.',
    type: String,
    example: "Serviço",
  })
  @IsString()
  @IsOptional()
  obs?: string;

  @ApiProperty({
    description: 'Serviço.',
    type: String,
    example: "Serviço",
  })
  @IsString()
  @IsOptional()
  servico?: string;
}

export type FaturaItemUnion = MensalidadeItemDto | ServicoItemDto;
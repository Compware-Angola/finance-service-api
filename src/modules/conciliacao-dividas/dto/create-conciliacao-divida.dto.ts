import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ConciliacaoInvoiceItemDto {
  @ApiProperty({
    description: 'ID do item da fatura.',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  InvoiceItemId: number;

  @ApiProperty({
    description: 'Valor conciliado.',
    example: 1500,
  })
  @IsNumber()
  @Type(() => Number)
  valor: number;
}
export class ExcluirInvoiceItemDto {
  @ApiProperty({
    description: 'ID do item da fatura a excluir da nova fatura.',
    example: 3,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  InvoiceItemId: number;
}

export class InvoiceDto {
  @ApiProperty({
    description: 'ID da Fatura.',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  invoiceId: number;

  @ApiProperty({
    description: 'Itens da fatura.',
    type: [ConciliacaoInvoiceItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConciliacaoInvoiceItemDto)
  itens: ConciliacaoInvoiceItemDto[];

  @ApiProperty({
    description:
      'Itens da fatura original que NÃO devem ser incluídos na nova fatura.',
    type: [ExcluirInvoiceItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcluirInvoiceItemDto)
  itensExcluidos?: ExcluirInvoiceItemDto[];
}

export class CreateConciliacaoDividaDto {
  @ApiProperty({
    description: 'Descrição da conciliação.',
    example: 'Conciliação de pagamento',
    required: false,
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({
    description: 'ID da negociação da dívida.',
    example: 1,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoNegociacaoDivida: number;

  @ApiProperty({
    description: 'Lista de faturas.',
    type: [InvoiceDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceDto)
  invoices: InvoiceDto[];
}


import { 

  IsNumber, 
  IsString, 
  IsOptional, 
  Min, 
  IsInt, 

} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({
    description: 'Código do produto ou serviço associado ao item da fatura.',
    type: Number,
    example: 101,
  })
  @IsInt()
  CodigoProduto: number;

  @ApiProperty({
    description: 'Quantidade de unidades do item.',
    type: Number,
    example: 2,
  })
  @IsNumber()
  @Min(0)
  Quantidade: number;

  @ApiProperty({
    description: 'Preço unitário do item.',
    type: Number,
    example: 7500.0,
  })
  @IsNumber()
  @Min(0)
  preco: number;

  @ApiProperty({
    description: 'Total do item (Quantidade * Preço).',
    type: Number,
    example: 15000.0,
  })
  @IsNumber()
  @Min(0)
  Total: number;

  @ApiProperty({
    description: 'Valor pago deste item (caso pagamento parcial).',
    type: Number,
    example: 15000.0,
  })
  @IsOptional()
  @IsNumber()
  valor_pago?: number;

  @ApiProperty({
    description: 'Observações adicionais sobre o item.',
    type: String,
    example: 'Pagamento da propina do mês de Outubro.',
  })
  @IsOptional()
  @IsString()
  obs?: string;

  @ApiProperty({
    description: 'Taxa de IVA aplicada (%).',
    type: Number,
    example: 14,
  })
  @IsOptional()
  @IsNumber()
  taxaIva?: number;

  @ApiProperty({
    description: 'Valor do IVA calculado.',
    type: Number,
    example: 2100.0,
  })
  @IsOptional()
  @IsNumber()
  valorIva?: number;

  @ApiProperty({
    description: 'Percentual de retenção na fonte (caso aplicável).',
    type: Number,
    example: 6.5,
  })
  @IsOptional()
  @IsNumber()
  retencao?: number;

  @ApiProperty({
    description: 'Base de incidência para cálculo de impostos.',
    type: Number,
    example: 18000.0,
  })
  @IsOptional()
  @IsNumber()
  incidencia?: number;

  @ApiProperty({
    description: 'Valor de desconto aplicado ao item.',
    type: Number,
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  valorDesconto?: number;

  @ApiProperty({
    description: 'Percentual de desconto aplicado ao produto.',
    type: Number,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  descontoProduto?: number;

  @ApiProperty({
    description: 'Mês de referência do item.',
    type: String,
    example: 'Outubro',
  })
  @IsOptional()
  @IsString()
  mes?: string;

  @ApiProperty({
    description: 'Valor de multa associado ao item (caso atraso).',
    type: Number,
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  multa?: number;

  @ApiProperty({
    description: 'ID do mês temporário (chave estrangeira).',
    type: Number,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  mesTempId?: number;

  @ApiProperty({
    description: 'Estado do item (0 = ativo, 1 = removido, "etc").',
    type: Number,
    example: 0,
  })
  @IsOptional()
  @IsInt()
  estado?: number;

  @ApiProperty({
    description: 'Valor já pago neste item.',
    type: Number,
    example: 5000.0,
  })
  @IsOptional()
  @IsNumber()
  valorPago?: number;

  @ApiProperty({
    description: 'Valor a transportar para outro item ou fatura.',
    type: Number,
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  valorATransportar?: number;

  @ApiProperty({
    description: 'Código da fatura à qual o item pertence.',
    type: Number,
    example: 1023,
  })
  @IsOptional()
  @IsInt()
  codigoFactura?: number;
}

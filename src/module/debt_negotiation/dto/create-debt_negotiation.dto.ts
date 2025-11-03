import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { MensalidadeItemDto, ServicoItemDto } from './util.dto';

// Assumindo que MensalidadeItemDto e ServicoItemDto foram importados com os decoradores Swagger

export type TipoPagamento = 'TOTAL' | 'PARCELADO';

// Para garantir que o Swagger gere os modelos aninhados
@ApiExtraModels(MensalidadeItemDto, ServicoItemDto)
export class CreateDebtNegotiationDto {

  @ApiProperty({
    description: 'Valor total da dívida original.',
    example: 54500.00,
  })
  @IsNotEmpty()
  @IsNumber()
  totalDivida: number;

  @ApiPropertyOptional({
    description: 'Valor total do desconto aplicado (opcional).',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  desconto: number;

  @ApiProperty({
    description: 'Preço total após a negociação e descontos.',
    example: 54500.00,
  })
  @IsNotEmpty()
  @IsNumber()
  precoTotal: number;

  @ApiProperty({
    description: 'Total de retenção (impostos/taxas) aplicáveis.',
    example: 0.00,
  })
  @IsNotEmpty()
  @IsNumber()
  total_retencao: number;

  @ApiProperty({
    description: 'Total da incidência (base de cálculo).',
    example: 54500.00,
  })
  @IsNotEmpty()
  @IsNumber()
  total_incidencia: number;

  @ApiProperty({
    description: 'Valor total do IVA (Imposto sobre Valor Agregado).',
    example: 0.00,
  })
  @IsNotEmpty()
  @IsNumber()
  totalIVA: number;

  @ApiPropertyOptional({
    description: 'Saldo a ser resetado (opcional).',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  saldo_reset: number;

  @ApiProperty({
    description: 'Define se o pagamento é total ou parcelado.',
    enum: ['TOTAL', 'PARCELADO'],
    example: 'TOTAL',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['TOTAL', 'PARCELADO'], { message: 'O tipoPagamento deve ser TOTAL ou PARCELADO' })
  tipoPagamento: TipoPagamento;

  @ApiProperty({
    description: 'Lista de itens de mensalidade envolvidos na negociação.',
    type: [MensalidadeItemDto], // Indica que é um array deste DTO
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MensalidadeItemDto) // Necessário para o class-transformer
  fatura_item_mensalidades: MensalidadeItemDto[]

  @ApiProperty({
    description: 'Lista de itens de serviços envolvidos na negociação.',
    type: [ServicoItemDto], // Indica que é um array deste DTO
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicoItemDto) // Necessário para o class-transformer
  fatura_item_servicos: ServicoItemDto[]

  @ApiPropertyOptional({
    description: 'Valor pago no momento da negociação. **Obrigatório se `tipoPagamento` for PARCELADO**.',
    example: 10000.00,
  })
  @ValidateIf(o => o.tipoPagamento === 'PARCELADO')
  @IsNumber()
  valor_pago_na_hora!: number;

 @ApiPropertyOptional({
      description: 'Percentagem de retenção aplicada (opcional).',
      type: Number, // Ajuste o tipo conforme necessário
    })
    @IsOptional()
    @IsNumber() // Ou @IsString() se for uma string
    percentagem_retencao?: number;
    
    @ApiPropertyOptional({
      description: 'Campo adicional "size" (opcional).',
      type: Number, // Ajuste o tipo conforme necessário
    })
    @IsOptional()
    @IsNumber() // Ou @IsString()
    size?: number;
    
    @ApiPropertyOptional({
      description: 'Indica se há bolsa de estudo (opcional).',
      type: String, // Ajuste o tipo conforme necessário
    })
    @IsOptional()
    @IsString()
    bolsa?: string;
    
    @ApiPropertyOptional({
      description: 'Soma do valor da dívida de recurso (opcional).',
      type: Number, // Ajuste o tipo conforme necessário
    })
    @IsOptional()
    @IsNumber()
    somaValorDividaRecurso?: number;

}





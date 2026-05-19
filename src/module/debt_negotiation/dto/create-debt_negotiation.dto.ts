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
import { ApiProperty, ApiPropertyOptional, ApiExtraModels } from '@nestjs/swagger';
import { MensalidadeItemDto, ServicoItemDto } from './util.dto';

export type TipoPagamento = 'TOTAL' | 'PARCELADO';

@ApiExtraModels(MensalidadeItemDto, ServicoItemDto)
export class CreateDebtNegotiationDto {

  @ApiProperty({ description: 'Valor total da dívida original.', example: 54500.00 })
  @IsNotEmpty()
  @IsNumber()
  totalDivida: number;

  @ApiProperty({ description: 'Preço total após negociação e descontos.', example: 54500.00 })
  @IsNotEmpty()
  @IsNumber()
  precoTotal: number;

  @ApiProperty({ description: 'Total de retenção aplicável.', example: 0 })
  @IsNotEmpty()
  @IsNumber()
  total_retencao: number;

  @ApiProperty({ description: 'Base de cálculo (incidência).', example: 54500.00 })
  @IsNotEmpty()
  @IsNumber()
  total_incidencia: number;

  @ApiProperty({ description: 'Valor total do IVA.', example: 0 })
  @IsNotEmpty()
  @IsNumber()
  totalIVA: number;

  @ApiPropertyOptional({ description: 'Valor total do desconto.', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  desconto?: number;

  @ApiPropertyOptional({ description: 'Percentagem de retenção aplicada.', example: 0 })
  @IsOptional()
  @IsNumber()
  percentagem_retencao?: number;

  @ApiProperty({
    description: 'Tipo de pagamento: total ou parcelado.',
    enum: ['TOTAL', 'PARCELADO'],
    example: 'TOTAL',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['TOTAL', 'PARCELADO'], { message: 'tipoPagamento deve ser TOTAL ou PARCELADO' })
  tipoPagamento: TipoPagamento;
  @ApiProperty({ description: 'Itens de mensalidades da negociação.', type: [MensalidadeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MensalidadeItemDto)
  Mensalidades: MensalidadeItemDto[];

  @ApiProperty({ description: 'Itens de serviços da negociação.', type: [ServicoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServicoItemDto)
  OutrosServicos: ServicoItemDto[];
}
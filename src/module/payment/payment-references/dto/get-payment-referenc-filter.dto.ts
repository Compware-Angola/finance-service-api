import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetPaymentRefenceFilterDto {
  @ApiPropertyOptional({ type: String, format: 'date', description: 'Data inicial do filtro (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ type: String, format: 'date', description: 'Data final do filtro (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @ApiPropertyOptional({ type: Number, description: 'Código do produto/fatura item' })
  @IsOptional()
  @IsNumber()
      @Type(() => Number)
  codigoproduto?: number;

  @ApiPropertyOptional({ type: String, description: 'Status da referência de pagamento' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: Number, description: 'Código da fatura' })
  @IsOptional()
  @IsNumber()
      @Type(() => Number)
  codigoFactura?: number;

  @ApiPropertyOptional({ type: Number, description: 'Código da matrícula' })
  @IsOptional()
  @IsNumber()
      @Type(() => Number)
  codigoMatricula?: number;

  @ApiPropertyOptional({ type: String, description: 'Referência do pagamento' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ type: Number, description: 'Ano letivo da fatura' })
  @IsOptional()
  @IsNumber()
      @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ type: Number, description: 'Número de registros por página', default: 10 })
  @IsOptional()
  @IsNumber()
    @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ type: Number, description: 'Número da página atual', default: 1 })
  @IsOptional()
  @IsNumber()
   @Type(() => Number)
  page?: number;
}

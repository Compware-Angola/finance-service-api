import { IsDateString, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ListPaymentDTO extends PaginationQueryDto {
  @ApiProperty({
    description: 'Ano lectivo correspondente',
    example: 23,
  })
  @IsInt()
  @Type(() => Number)
  anoLectivo: number;
  @ApiPropertyOptional({
    description: 'Código da matrícula do aluno',
    example: 55426,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiPropertyOptional({ description: 'Código da factura', example: 1222829 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoFactura?: number;

  @ApiPropertyOptional({
    description: 'Estado do pagamento',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  estado?: number;

  @ApiPropertyOptional({
    description: 'Nome do Aluno',
    example: 'João',
  })
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Número de Operação Bancária',
    example: '588105REF1',
  })
  @IsOptional()
  n_operacao_bancaria?: string;

  @ApiPropertyOptional({
    description: 'Número de Operação Bancária 2',
    example: '1759237479',
  })
  @IsOptional()
  n_operacao_bancaria2?: string;



  @ApiPropertyOptional({
    description: 'Data de início',
    example: '2022-01-01',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim',
    example: '2022-12-31',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;
}

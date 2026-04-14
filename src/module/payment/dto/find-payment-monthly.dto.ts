import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindPaymentMonthlyDTO {
  @ApiPropertyOptional({ example: 22, description: 'Ano Lectivo' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({ example: 6, description: 'Curso' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({ example: 853126, description: 'Código do pagamento' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoPagamento?: number;

  @ApiPropertyOptional({ example: 2, description: 'Faculdade' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoFaculdade?: number;

  @ApiPropertyOptional({ example: 10, description: 'Matrícula' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiPropertyOptional({ example: 1, description: 'Período' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoPeriodo?: number;

  @ApiPropertyOptional({ example: 5, description: 'Mês (MES_TEMP_ID)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  mesId?: number;

  @ApiPropertyOptional({
    example: 'Maria',
    description: 'Nome do estudante',
  })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({ example: 1, description: 'Página' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Limite' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

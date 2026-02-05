import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class FilterTypeServiceAllDto {
  @ApiPropertyOptional({
    description: 'Sigla do serviço',
    example: 'IpuCricular(Anual)',
  })
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiPropertyOptional({
    description: 'Descrição do serviço',
    example: 'Inscrição por unidade Curricular(Anual)',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Código do ano lectivo',
    example: 23,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Estado do serviço (0 = Inativo, 1 = Ativo)',
    example: 'Ativo',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  estado?: string;

  @ApiPropertyOptional({
    description: 'Tipo de serviço',
    example: 'Anual',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  tipoServico?: string;

  @ApiPropertyOptional({
    description: 'Visualizar no portal do aluno',
    example: 'NAO',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  visualizarNoPortal?: string;

  /* ================= PAGINAÇÃO ================= */

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registos por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

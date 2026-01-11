import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class FilterTypeServiceDto {
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
  @IsNumber()
   @Type(() => Number)
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Estado do serviço (0 = Inativo, 1 = Ativo)',
    example: 'Ativo',
  })
  @IsOptional()
 @IsString()
   @Type(() => String)
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
  @IsString()
   @Type(() => String)
  visualizarNoPortal?: string;
}

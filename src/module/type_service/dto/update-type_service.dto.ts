import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTypeServiceDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID da taxa de IVA',
  })
  @IsOptional()
  @IsNumber()
  taxaIvaId?: number;

  @ApiPropertyOptional({
    example: 101,
    description: 'Código do motivo de isenção de IVA',
  })
  @IsOptional()
  @IsNumber()
  motivoIsencaoIvaCodigo?: number;

  @ApiPropertyOptional({
    example: 28000,
    description: 'Preço do serviço',
  })
  @IsOptional()
  @IsNumber()
  preco?: number;

  @ApiPropertyOptional({
    example: 'Propina Engenharia Informática',
    description: 'Descrição do serviço',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    example: 'ANUAL',
    description: 'Tipo de serviço',
  })
  @IsOptional()
  @IsString()
  tipoServico?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado do serviço (true = Ativo, false = Inativo)',
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Data do serviço',
  })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Disponibilizar ao aluno',
  })
  @IsOptional()
  @IsBoolean()
  disponibilizarAluno?: boolean;

  @ApiPropertyOptional({
    example: 25,
    description: 'Código da grade curricular',
  })
  @IsOptional()
  @IsNumber()
  codigoGradeCurricular?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se é um serviço de mestrado',
  })
  @IsOptional()
  @IsBoolean()
  mestrado?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Canal',
  })
  @IsOptional()
  @IsNumber()
  canal?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Polo',
  })
  @IsOptional()
  @IsNumber()
  poloId?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Serviço destinado ao polo do Cacuaco',
  })
  @IsOptional()
  @IsBoolean()
  cacuaco?: boolean;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Código do ano lectivo',
  })
  @IsOptional()
  @IsNumber()
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    example: 25000,
    description: 'Valor anterior do serviço',
  })
  @IsOptional()
  @IsNumber()
  valorAnterior?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Visualizar no portal',
  })
  @IsOptional()
  @IsBoolean()
  visualizarNoPortal?: boolean;

  @ApiPropertyOptional({
    example: 'PROP',
    description: 'Sigla do serviço',
  })
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiPropertyOptional({
    example: 'Pendente',
    description: 'Estado da solicitação',
  })
  @IsOptional()
  @IsString()
  estadoSolicitacao?: string;

  @ApiPropertyOptional({
    example: 'NORMAL',
    description: 'Tipo de candidatura',
  })
  @IsOptional()
  @IsString()
  tipoCandidatura?: string;
}
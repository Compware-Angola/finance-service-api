import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateTypeServiceDto {
  @ApiProperty({ example: 1, description: 'ID da taxa de IVA' })
  @IsNumber()
  taxaIvaId?: number;

  @ApiPropertyOptional({ example: 101, description: 'Código do motivo de isenção de IVA' })
  @IsNumber()
  motivoIsencaoIvaCodigo?: number;

  @ApiProperty({ example: 25000, description: 'Preço do serviço' })
  @IsNumber()
  preco: number;

  @ApiProperty({ example: 'Propina Mensal', description: 'Descrição do serviço' })
  @IsString()
  descricao: string;

  @ApiPropertyOptional({ example: 'ENSINO', description: 'Tipo de serviço' })
  @IsOptional()
  @IsString()
  tipoServico: string;

  @ApiPropertyOptional({ example: true, description: 'Estado do serviço' })
  @IsOptional()
  @IsBoolean()
  estado: boolean;

  @ApiPropertyOptional({ example: '2025-01-10', description: 'Data de criação' })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({ example: true, description: 'Disponível para alunos' })
  @IsOptional()
  @IsBoolean()
  disponibilizarAluno?: boolean;

  @ApiPropertyOptional({ example: 202, description: 'Código da grade curricular' })
  @IsOptional()
  @IsNumber()
  codigoGradeCurricular?: number;

  @ApiPropertyOptional({ example: false, description: 'Indica se é mestrado' })
  @IsOptional()
  @IsBoolean()
  mestrado?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Canal de venda' })
  @IsOptional()
  @IsNumber()
  canal?: number;

  @ApiProperty({ example: 3, description: 'ID do polo' })
  @IsNumber()
  poloId?: number;

  @ApiPropertyOptional({ example: false, description: 'Disponível no polo Cacuaco' })
  @IsOptional()
  @IsBoolean()
  cacuaco?: boolean;

  @ApiProperty({ example: 2025, description: 'Código do ano lectivo' })
  @IsNumber()
  codigoAnoLectivo: number;

  @ApiPropertyOptional({ example: 20000, description: 'Valor anterior do serviço' })
  @IsOptional()
  @IsNumber()
  valorAnterior?: number;

  @ApiPropertyOptional({ example: true, description: 'Visualizar no portal do aluno' })
  @IsOptional()
  @IsBoolean()
  visualizarNoPortal?: boolean;

  @ApiProperty({ example: 'PROP', description: 'Sigla do serviço' })
  @IsString()
  sigla?: string;

  @ApiPropertyOptional({ example: 1, description: 'Estado da solicitação' })
  @IsOptional()
  @IsNumber()
  estadoSolicitacao?: number;

  @ApiPropertyOptional({ example: 2, description: 'Tipo de candidatura' })
  @IsOptional()
  @IsNumber()
  tipoCandidatura?: number;
}

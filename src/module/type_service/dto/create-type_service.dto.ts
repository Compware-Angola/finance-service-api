import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateTypeServiceDto {
  @IsNumber()
  taxaIvaId?: number;

  @IsNumber()
  motivoIsencaoIvaCodigo?: number;

  @IsNumber()
  preco: number;

  @IsString()
  descricao: string;

  @IsOptional()
  @IsString()
  tipoServico: string;

  @IsOptional()
  @IsBoolean()
  estado: boolean;

  @IsOptional()
  @IsString()
  data?: string;

  @IsOptional()
  @IsBoolean()
  disponibilizarAluno?: boolean;

  @IsOptional()
  @IsNumber()
  codigoGradeCurricular?: number;

  @IsOptional()
  @IsBoolean()
  mestrado?: boolean;

  @IsOptional()
  @IsNumber()
  canal?: number;

  @IsNumber()
  poloId?: number;

  @IsOptional()
  @IsBoolean()
  cacuaco?: boolean;

  @IsNumber()
  codigoAnoLectivo: number;

  @IsOptional()
  @IsNumber()
  valorAnterior?: number;

  @IsOptional()
  @IsBoolean()
  visualizarNoPortal?: boolean;

  @IsString()
  sigla?: string;

  @IsOptional()
  @IsNumber()
  estadoSolicitacao?: number;

  @IsOptional()
  @IsNumber()
  tipoCandidatura?: number;
}

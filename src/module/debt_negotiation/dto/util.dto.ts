// dto/fatura-item.dto.ts
import {
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  IsIn,
  IsInt,
} from 'class-validator';
import { IsNull } from 'typeorm';

// === ITEM DE MENSALIDADE ===
export class MensalidadeItemDto {
 @IsString()
  @IsOptional()
  codGradeCurricular?: string;

  @IsString()
  @IsOptional()
  codFacturaOutrosServicos?: string;

  @IsString()
  valor: string; 

  @IsNumber()
  multa: number;

  @IsNumber()
  total: number;

  @IsString()
  servico: string;

  @IsString()
  mes_propina: string;

  @IsInt()
  @IsOptional()
  mes_temp_id?: number;

  @IsInt()
  @IsOptional()
  n_prestacao?: number;

  @IsString()
  ano_lectivo: string;

  @IsNumber()
  taxa_multa: number;

  @IsNumber()
  taxa_desconto: number;

  @IsString()
  @IsOptional()
  bolsa?: string;

  @IsInt()
  codigo_propina: number;

  @IsInt()
  codigo_anoLectivo: number;

  @IsNumber()
  desconto: number;

  @IsNumber()
  incidencia: number;

  @IsNumber()
  valor_iva: number;

  @IsInt()
  tipo_taxas: number;

  @IsString()
  taxa_descricao: string;
}

// === ITEM DE SERVIÇO ===
export class ServicoItemDto {
  @IsInt()
  codGradeCurricular: number;

  @IsInt()
  codFacturaOutrosServicos: number;

  @IsNumber()
  valor: number;

  @IsNumber()
  multa: number;

  @IsNumber()
  total: number;

  @IsString()
  servico: string;

  @IsString()
  mes_propina: string;


  @IsOptional()
  mes_temp_id?: null;

  @IsString()
  @IsOptional()
  n_prestacao?: string;

  @IsString()
  ano_lectivo: string;

  @IsNumber()
  taxa_multa: number;

  @IsNumber()
  taxa_desconto: number;

  @IsString()
  @IsOptional()
  bolsa?: string;

  @IsString()
  codidigo_servico: string;

  @IsString()
  codigo_anoLectivo: string;

  @IsNumber()
  desconto: number;

  @IsNumber()
  incidencia: number;

  @IsNumber()
  valor_iva: number;

  @IsString()
  taxa_descricao: string;
}

// === UNIÃO DOS DOIS ===
export type FaturaItemUnion = MensalidadeItemDto | ServicoItemDto;
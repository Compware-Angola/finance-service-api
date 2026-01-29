import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class UpdateTypeServiceDto {
  @IsOptional() @IsNumber() taxaIvaId?: number;
  @IsOptional() @IsNumber() motivoIsencaoIvaCodigo?: number;
  @IsOptional() @IsNumber() poloId?: number;
  @IsOptional() @IsNumber() codigoAnoLectivo?: number;
  @IsOptional() @IsNumber() preco?: number;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsBoolean() estado?: boolean;
}

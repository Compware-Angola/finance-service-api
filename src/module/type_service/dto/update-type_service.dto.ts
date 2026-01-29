import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class UpdateTypeServiceDto {
  @ApiPropertyOptional({ example: 1, description: 'ID da taxa de IVA' })
  @IsOptional()
  @IsNumber()
  taxaIvaId?: number;

  @ApiPropertyOptional({ example: 101, description: 'Código do motivo de isenção de IVA' })
  @IsOptional()
  @IsNumber()
  motivoIsencaoIvaCodigo?: number;

  @ApiPropertyOptional({ example: 3, description: 'ID do polo' })
  @IsOptional()
  @IsNumber()
  poloId?: number;

  @ApiPropertyOptional({ example: 2025, description: 'Código do ano lectivo' })
  @IsOptional()
  @IsNumber()
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({ example: 28000, description: 'Novo preço do serviço' })
  @IsOptional()
  @IsNumber()
  preco?: number;

  @ApiPropertyOptional({ example: 'Propina Atualizada', description: 'Descrição do serviço' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: true, description: 'Estado do serviço' })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}

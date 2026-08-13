import {
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class BolsaItemDto {
  @ApiPropertyOptional({
    description: 'Código da bolsa',
    example: 12,
  })
  @IsInt()
  codigoBolsa: number;

  @ApiPropertyOptional({
    description: 'Número máximo de estudantes para esta bolsa neste contrato',
    example: 25,
  })
  @IsInt()
  numeroMaximoEstudante: number;
}

export class UpdateContratoBolsaDto {
  @ApiPropertyOptional({
    description: 'Código da instituição associada ao contrato',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  codigoInstituicao?: number;

  @ApiPropertyOptional({
    description: 'Data de início do contrato no formato YYYY-MM-DD',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do contrato no formato YYYY-MM-DD',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Estado do contrato (1 = activo, 0 = inactivo)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  estado?: number;

  @ApiPropertyOptional({
    description:
      'Lista de bolsas associadas ao contrato. Quando enviada, substitui por completo os itens existentes',
    type: [BolsaItemDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BolsaItemDto)
  bolsas?: BolsaItemDto[];
}

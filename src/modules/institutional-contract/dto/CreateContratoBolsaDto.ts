import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class BolsaItemDto {
  @ApiProperty({
    description: 'Código da bolsa',
    example: 12,
  })
  @IsInt()
  codigoBolsa: number;

  @ApiProperty({
    description: 'Número máximo de estudantes para esta bolsa neste contrato',
    example: 25,
  })
  @IsInt()
  numeroMaximoEstudante: number;
}

export class CreateContratoBolsaDto {
  @ApiProperty({
    description: 'Código da instituição associada ao contrato',
    example: 3,
  })
  @IsInt()
  codigoInstituicao: number;

  @ApiProperty({
    description: 'Data de início do contrato no formato YYYY-MM-DD',
    example: '2025-01-01',
  })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({
    description: 'Data de fim do contrato no formato YYYY-MM-DD',
    example: '2025-12-31',
  })
  @IsDateString()
  dataFim: string;

  @ApiPropertyOptional({
    description: 'Estado do contrato (1 = activo, 0 = inactivo)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  estado?: number;

  @ApiProperty({
    description: 'Lista de bolsas associadas ao contrato',
    type: [BolsaItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BolsaItemDto)
  bolsas: BolsaItemDto[];
}

import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIsencaoDto {
  @ApiProperty({ description: 'Código da matrícula' })
  @IsNotEmpty()
  @IsNumber()
  codigoMatricula: number;

  @ApiProperty({ description: 'Código do serviço' })
  @IsNotEmpty()
  @IsNumber()
  codigoServico: number;

  @ApiProperty({ description: 'Código do utilizador', required: false })
  @IsOptional()
  @IsNumber()
  codigoUtilizador?: number;

  @ApiProperty({ description: 'Data da isenção', example: '2024-05-20' })
  @IsNotEmpty()
  @IsDateString()
  dataIsencao: string;

  @ApiProperty({ description: 'Canal', required: false })
  @IsOptional()
  @IsNumber()
  canal?: number;

  @ApiProperty({ description: 'Observações', required: false })
  @IsOptional()
  @IsString()
  obs?: string;

  @ApiProperty({ description: 'Código do ano lectivo' })
  @IsNotEmpty()
  @IsNumber()
  codigoAnoLectivo: number;

  @ApiProperty({ description: 'Código da pré-inscrição', required: false })
  @IsOptional()
  @IsNumber()
  codigoPreInscricao?: number;
}

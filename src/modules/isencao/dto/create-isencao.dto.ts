import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateIsencaoDto {
  @ApiProperty({ description: 'Código da matrícula', type: [Number] })
  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  codigoMatriculas: number[];

  @ApiProperty({ description: 'Código do serviço' })
  @IsNotEmpty()
  @IsNumber()
  codigoServico: number;

  @ApiProperty({ description: 'Código do utilizador', required: false })
  @IsOptional()
  @IsNumber()
  codigoUtilizador?: number;

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

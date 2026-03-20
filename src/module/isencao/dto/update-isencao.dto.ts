import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateIsencaoDto } from './create-isencao.dto';
import {
  IsOptional,
  IsString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIsencaoDto extends PartialType(
  OmitType(CreateIsencaoDto, ['codigoMatriculas']),
) {
  @ApiProperty({ description: 'Código da matrícula' })
  @IsNotEmpty()
  @IsNumber()
  codigoMatricula: number;
  @ApiProperty({
    description: 'ACTIVO ou INACTIVO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['Activo', 'Inactivo'])
  estadoIsencao?: string;

  @ApiProperty({ description: 'Data da isenção', example: '2024-05-20' })
  @IsNotEmpty()
  @IsDateString()
  dataIsencao: string;
}

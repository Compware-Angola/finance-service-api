import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class MesTempItemDto {
  @ApiProperty({ description: 'ID do mês' })
  @IsNotEmpty()
  @IsNumber()
  mesTempId: number;

  @ApiProperty({ description: 'ID do serviço' })
  @IsNotEmpty()
  @IsNumber()
  servicoId: number;
}

export class CreateIsencaoMultaDTO {
  @ApiProperty({ description: 'Código de Matricula' })
  @IsNotEmpty()
  @IsNumber()
  codigoMatricula: number;

  @ApiProperty({
    description: 'Meses com serviços',
    type: [MesTempItemDto],
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MesTempItemDto)
  mesTemps!: MesTempItemDto[];

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
  codigoAnoLectivo!: number;

  @ApiProperty({ description: 'CodigoMotivo', required: false })
  @IsOptional()
  @IsNumber()
  codigoMotivo?: number;
}

import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidarEstudanteCreditoDto {
  @ApiProperty({ example: 10045, description: 'Código da matrícula' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiProperty({ example: 23, description: 'Código do ano lectivo' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({ example: 1, description: 'Semestre' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  semestre: number;
}

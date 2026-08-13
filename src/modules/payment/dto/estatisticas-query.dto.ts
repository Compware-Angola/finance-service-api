import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class EstatisticasQueryDto {
  @ApiProperty({
    example: '2022-01-01',
    description: 'Data de início',
  })
  @IsDateString()
  @IsNotEmpty()
  dataInicio: string;

  @ApiProperty({
    example: '2022-03-01',
    description: 'Data de fim',
  })
  @IsDateString()
  @IsNotEmpty()
  dataFim: string;
}

export type PagamentoDiaDto = Record<string, string | number>;

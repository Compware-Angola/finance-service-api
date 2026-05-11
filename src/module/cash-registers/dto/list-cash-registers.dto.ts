import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListCashRegistersDto {
  @ApiPropertyOptional({
    example: 'Caixa 1',
    description: 'Nome ou código do caixa',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Status do caixa',

    examples: {
      aberto: {
        value: 'aberto',
      },

      fechado: {
        value: 'fechado',
      },
    },
  })
  @IsOptional()
  @IsIn(['aberto', 'fechado'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Estado de bloqueio',

    examples: {
      ativo: {
        value: 'N',
      },

      bloqueado: {
        value: 'S',
      },
    },
  })
  @IsOptional()
  @IsIn(['S', 'N'])
  blocked?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCashRegistersDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Página',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Itens por página',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

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

export class ListCashRegistersForOpeningDto {
  @ApiPropertyOptional({
    example: 'Caixa 1',
    description: 'Nome ou código do caixa',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Número da página',
    required: false,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Itens por página',
    required: false,
    default: 10,
    type: Number,
  }) // 👈 EXPLICITO
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}

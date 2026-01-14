import { IsNotEmpty, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class GetDebtNegotiationFilterDto extends PaginationQueryDto {
  
  @ApiProperty({ 
    description: 'Código do ano letivo (obrigatório)', 
    example: 23,
    required: true,
    type: Number,
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({
    description: 'Código do curso',
    example: 15,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiProperty({
    description: 'ID do tipo de negociação',
    example: 1,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  tipoNegociacaoId?: number;

  @ApiProperty({
    description: 'ID da faculdade',
    example: 2,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  faculdadeId?: number;
}
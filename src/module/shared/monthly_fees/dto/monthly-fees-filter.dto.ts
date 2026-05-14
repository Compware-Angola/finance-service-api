// dto/monthly-fees-filter.dto.ts
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class MonthlyFeesFilterDto extends PaginationQueryDto  {
  @ApiProperty({ description: 'O código de matrícula do aluno (obrigatório).', "type": Number, "example": 12345 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  codigo_matricula: number;

  @ApiProperty({ description: 'O código do ano letivo para filtragem (obrigatório).', "type": Number, "example": 21 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  codAnoLectivo: number;


  @IsOptional()

  status?: 'all' | 'paid' | 'pending'| string;
}
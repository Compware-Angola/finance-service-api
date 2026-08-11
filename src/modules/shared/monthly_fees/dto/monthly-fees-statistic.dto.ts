import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MonthlyFeesStatisticFilterDto {
  @ApiProperty({
    description: 'O código de matrícula do aluno (obrigatório).',
    type: Number,
    example: 12345,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  codigo_matricula: number;
}

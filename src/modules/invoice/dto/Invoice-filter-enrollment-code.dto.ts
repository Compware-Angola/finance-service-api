import { IsNotEmpty, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger'; // 👈 Certifique-se desta importação
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class InvoiceFilterEnrollmentDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'O Código da Matrícula (CodigoMatricula) a ser filtrado.',
    example: 12345,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiProperty({
    description: 'O Código da Matrícula (CodigoMatricula) a ser filtrado.',
    example: 12345,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  codigoPreInscricao?: number;

  @ApiProperty({
    description: 'O Codigo do ano lectivi',
    example: 23,
    required: true,
    type: Number,
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  academicYear!: number;

  @ApiProperty({
    description: 'Status da fatura',
    example: 1,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  status?: number;
}

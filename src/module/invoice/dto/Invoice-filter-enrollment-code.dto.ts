import { IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger'; // 👈 Certifique-se desta importação
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class InvoiceFilterEnrollmentDto extends PaginationQueryDto {
  
  @ApiProperty({ 
      description: 'O Código da Matrícula (CodigoMatricula) a ser filtrado.', 
      example: 12345,
      required: true,
      type: Number, 
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number) 
  codigoMatricula: number;
}
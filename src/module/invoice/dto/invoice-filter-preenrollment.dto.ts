import { IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

// Estende o DTO de paginação para incluir o filtro de Pré-Inscrição
export class InvoiceFilterPreEnrollmentDto extends PaginationQueryDto {
  /**
   * O Código da Pré-Inscrição (codigo_preinscricao) a ser filtrado.
   * @example 54321
   */
  @ApiProperty({ 
      description: 'O Código da Pré-Inscrição (codigo_preinscricao) a ser filtrado.', 
      example: 54321,
      required: true,
      type: Number,
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  codigoPreinscricao: number;
}
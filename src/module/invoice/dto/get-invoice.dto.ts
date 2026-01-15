import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Type } from 'class-transformer';

export class InvoiceSearchDto  extends PaginationQueryDto{
  @ApiPropertyOptional({ type: String, description: 'Palavra-chave para buscar faturas (nome, descrição, curso, polo,referencia)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number, description: 'Ano letivo da fatura' })
  @IsOptional()
  @IsNumber()
   @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ type: Number, description: 'Código da matrícula' })
  @IsOptional()
  @IsNumber()
    @Type(() => Number)
  codigoMatricula?: number;

  @ApiPropertyOptional({ type: String, description: 'Referência da fatura' })
  @IsOptional()
  @IsString()

  reference?: string;

    @ApiPropertyOptional({ type: String, description: 'Estado da Nota' })
  @IsOptional()
  @IsString()

  status?: string;


}

import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class StudentPaymentsQueryDto extends PaginationQueryDto {

    @ApiPropertyOptional({ description: 'Código da matrícula do aluno', example: 57357 })
    @IsOptional()
    @Type(() => Number)
    codigoMatricula?: number;

    @ApiPropertyOptional({ description: 'Código da pré-inscrição', example: 116956 })
    @IsOptional()
    @Type(() => Number)
    codigoPreInscricao?: number;
    @ApiPropertyOptional({ description: 'Código da factura', example: 451853 })
    @IsOptional()
    @Type(() => Number)
    codigoFactura?: number;

    @ApiPropertyOptional({ description: 'Ano lectivo correspondente', example: 21 })
    @IsOptional()
    @Type(() => Number)
    anoLectivo?: number;
}









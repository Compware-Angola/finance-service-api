import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindBolsaDto {
    @ApiPropertyOptional({ example: 'Mérito', description: 'Filtrar por designação' })
    @IsOptional()
    @IsString()
    designacao?: string;

    @ApiPropertyOptional({ example: 'Universidade Agostinho Neto', description: 'Filtrar por nome da instituição' })
    @IsOptional()
    @IsString()
    instituicao?: string;

    @ApiPropertyOptional({ example: 1, description: 'Código da instituição' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoInstituicao?: number;

    @ApiPropertyOptional({ example: 2, description: 'Código do tipo de crédito' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoCredito?: number;

    @ApiPropertyOptional({ example: 3, description: 'Código do tipo de desconto' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoDesconto?: number;

    @ApiPropertyOptional({ example: 1, description: 'Página actual (começa em 1)', default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, description: 'Número de registos por página', default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;
}
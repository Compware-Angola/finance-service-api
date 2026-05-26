import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBolsaDto {
    @ApiPropertyOptional({ example: 'Bolsa de Mérito', description: 'Designação da bolsa' })
    @IsOptional()
    @IsString()
    designacao?: string;

    @ApiPropertyOptional({ example: 1, description: 'Código da instituição' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoInstituicao?: number;

    @ApiPropertyOptional({ example: 2, description: 'Código do tipo de desconto' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoDesconto?: number;

    @ApiPropertyOptional({ example: 50.00, description: 'Valor do desconto' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    valorDesconto?: number;

    @ApiPropertyOptional({ example: 3, description: 'Código do tipo de crédito' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoCredito?: number;
}
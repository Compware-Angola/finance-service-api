import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FindPagamentoBolsaDto {
    @ApiPropertyOptional({ description: 'Código da bolsa', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    codigoBolsa?: number;

    @ApiPropertyOptional({ description: 'Código da instituição', example: 2 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    codigoInstituicao?: number;

    @ApiPropertyOptional({ description: 'Ano lectivo', example: 2024 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    anoLectivo?: number;

    @ApiPropertyOptional({ description: 'Semestre (1 ou 2)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    semestre?: number;

    @ApiPropertyOptional({ description: 'Estado (1=activo, 0=inactivo)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    estado?: number;

    @ApiPropertyOptional({ description: 'Nome da instituição (pesquisa parcial)', example: 'Agostinho' })
    @IsOptional()
    @IsString()
    nomeInstituicao?: string;

    @ApiPropertyOptional({ description: 'Apenas não pagos (1=sim, 0=não)', example: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    apenasSemPagamento?: number;

    @ApiPropertyOptional({ description: 'Página', example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Limite por página', example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;
}
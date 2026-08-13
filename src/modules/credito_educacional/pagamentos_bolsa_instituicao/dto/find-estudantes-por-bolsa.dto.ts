import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FindEstudantesPorBolsaDto {
    @ApiPropertyOptional({ description: 'Código da instituição', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    codigoInstituicao?: number;

    @ApiPropertyOptional({ description: 'Ano lectivo', example: 2024 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    anoLectivo?: number;

    @ApiPropertyOptional({ description: 'Semestre', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    semestre?: number;

    @ApiPropertyOptional({ description: 'Nome do estudante', example: 'João' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ description: 'Curso do estudante', example: 'Informática' })
    @IsOptional()
    @IsString()
    curso?: string;

    @ApiPropertyOptional({ description: 'Status do bolseiro (1=activo, 0=inactivo)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    statusBolseiro?: number;

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
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindCreditoEducacionalDto {
    @ApiPropertyOptional({ example: 5, description: 'Código da instituição' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoInstituicao?: number;

    @ApiPropertyOptional({ example: 2024, description: 'Código do ano lectivo' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoAnoLectivo?: number;

    @ApiPropertyOptional({ example: 1, description: 'Status do bolseiro (A/I)' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    status?: number;

    @ApiPropertyOptional({ example: 2, description: 'Código da bolsa' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoBolsa?: number;

    @ApiPropertyOptional({ example: 1, description: 'Código do tipo de crédito' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoCredito?: number;

    @ApiPropertyOptional({ example: 10045, description: 'Código da matrícula' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoMatricula?: number;

    @ApiPropertyOptional({ example: 'João Silva', description: 'Pesquisar por nome do estudante' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ example: 'Engenharia', description: 'Pesquisar por curso' })
    @IsOptional()
    @IsString()
    cursoDesignacao?: string;


    @ApiPropertyOptional({ example: 1, description: 'Código do curso' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    cursoId?: number;

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
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBolsaDto {
    @ApiProperty({ example: 'Bolsa de Mérito', description: 'Designação da bolsa' })
    @IsNotEmpty()
    @IsString()
    designacao: string;

    @ApiProperty({ example: 1, description: 'Código da instituição' })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    codigoInstituicao: number;

    @ApiPropertyOptional({ example: 2, description: 'Código do tipo de desconto' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoDesconto?: number;

    @ApiPropertyOptional({ example: 50.00, description: 'Valor do desconto' })

    @IsNumber()
    @Type(() => Number)
    valorDesconto: number;

    @ApiPropertyOptional({ example: 3, description: 'Código do tipo de crédito' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoCredito?: number;
}
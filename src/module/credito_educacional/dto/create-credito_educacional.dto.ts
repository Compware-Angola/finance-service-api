import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateCreditoEducacionalDto {

    @ApiProperty({ example: 123, description: 'Código da Bolsa' })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    codigoBolsa: number;

    @ApiProperty({ example: 10045, description: 'Código da Matrícula' })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    codigoMatricula: number;

    @ApiPropertyOptional({ example: 1, description: 'Código do Tipo de Bolsa' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoBolsa?: number;

    @ApiPropertyOptional({ example: 5000 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    desconto?: number;

    @ApiPropertyOptional({ example: 'S', description: 'Isenta Multa (S/N)' })
    @IsOptional()
    @IsString()
    @Length(1, 3)
    isentaMulta?: string;

    @ApiPropertyOptional({ example: 3, description: 'Canal' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    canal?: number;

    @ApiProperty({ example: 2024, description: 'Ano Lectivo' })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    codigoAnoLectivo: number;

    // === CAMPOS DE DATA (AGORA CLARAMENTE OPCIONAIS) ===
    @ApiPropertyOptional({ example: '2026-03-01', description: 'Data Início da Bolsa' })
    @IsOptional()
    @Type(() => Date)
    dataInicioBolsa?: Date;

    @ApiPropertyOptional({ example: '2026-12-31', description: 'Data Fim da Bolsa' })
    @IsOptional()
    @Type(() => Date)
    dataFimBolsa?: Date;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoInstituicao?: number;

    @ApiPropertyOptional({ example: 'N' })
    @IsOptional()
    @IsString()
    @Length(1, 3)
    pagarTaxasAdicionais?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    afectacao?: string;

    @ApiPropertyOptional({ example: 'Observação...' })
    @IsOptional()
    @IsString()
    observacao?: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    status: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    semestre?: number;

    @ApiProperty({ example: 1, description: 'Estado da Bolsa' })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    estadoBolsa: number;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    tipoAlunoId: number;



    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoDesconto?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoTipoCredito?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoCredito?: number;
}
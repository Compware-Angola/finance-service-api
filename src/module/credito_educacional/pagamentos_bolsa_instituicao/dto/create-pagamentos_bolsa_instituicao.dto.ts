import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsDateString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePagamentosBolsaInstituicaoDto {
    @ApiProperty({ description: 'Código da bolsa', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    codigoBolsa: number;

    @ApiProperty({ description: 'Ano lectivo', example: 2024 })
    @IsNotEmpty()
    @IsNumber()
    anoLectivo: number;

    @ApiProperty({ description: 'Semestre (1, 2 ou 3 para anual)', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    semestre: number;

    @ApiProperty({ description: 'Valor depositado pela instituição', example: 500000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0.01)
    valorDepositado: number;

    @ApiPropertyOptional({ description: 'Data do depósito', example: '2024-03-15' })
    @IsOptional()
    @IsDateString()
    dataDeposito?: string;

    @ApiPropertyOptional({ description: 'Referência bancária / comprovativo', example: 'REF-2024-001' })
    @IsOptional()
    referencia?: string;

    @ApiPropertyOptional({ description: 'Observação', example: 'Pagamento do 1º semestre' })
    @IsOptional()
    observacao?: string;
}

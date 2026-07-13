import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaymentServiceComparisonDto {
    @ApiPropertyOptional({
        example: 7,
        description: 'Mês da consulta. Se não informado será utilizado o mês atual.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({
        example: 2026,
        description: 'Ano da consulta. Se não informado será utilizado o ano atual.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({
        example: '6',
        description: 'Forma de pagamento.',
    })
    @IsOptional()
    @IsString()
    formaPagamento?: string;
}




export class PaymentServiceComparisonResponseDto {
    @ApiProperty({
        example: 'PROP',
    })
    label: string;

    @ApiProperty({
        example: 250,
    })
    totalPayments: number;

    @ApiProperty({
        example: 3500000,
    })
    totalAmount: number;
}
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaymentMonthlySummaryDto {
    @ApiPropertyOptional({
        description: 'Mês desejado para consulta. Caso não informe, será usado o mês atual.',
        example: 7,
        minimum: 1,
        maximum: 12,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month?: number;

    @ApiPropertyOptional({
        description: 'Ano desejado para consulta. Caso não informe, será usado o ano atual.',
        example: 2026,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    year?: number;

    @ApiPropertyOptional({
        description: 'Tipo de pagamento desejado para consulta. Caso não informe, será usado todos os tipos de pagamento.',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    formaPagamento?: number;

}
import { ApiProperty } from '@nestjs/swagger';

export class PaymentSummaryResponseDto {
    @ApiProperty({
        example: 150,
        description: 'Quantidade total de pagamentos',
    })
    totalPayments: number;

    @ApiProperty({
        example: 250000,
        description: 'Valor total arrecadado',
    })
    totalCollected: number;

    @ApiProperty({
        example: 1666.66,
        description: 'Valor médio dos pagamentos',
    })
    averagePayment: number;

    @ApiProperty({
        example: 500,
        description: 'Menor pagamento realizado',
    })
    smallestPayment: number;

    @ApiProperty({
        example: 10000,
        description: 'Maior pagamento realizado',
    })
    largestPayment: number;
}
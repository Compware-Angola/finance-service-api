import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumberString, IsOptional } from "class-validator";

export class PaymentSummaryDto {
    @ApiPropertyOptional({
        description: "Data inicial do período (YYYY-MM-DD). Se não informado, considera o dia atual.",
        example: "2025-01-01",
    })
    @IsOptional()
    @IsDateString()
    dataInicio?: string;

    @ApiPropertyOptional({
        description: "Data final do período (YYYY-MM-DD). Se não informado, considera o dia atual.",
        example: "2025-01-31",
    })
    @IsOptional()
    @IsDateString()
    dataFim?: string;

    @ApiPropertyOptional({
        description: "Código da forma de pagamento para filtrar o resumo.",
        example: "1",
    })
    @IsOptional()
    @IsNumberString()
    codigoFormaPagamento?: string;
}

export class PaymentSummaryResponseDto {
    @ApiPropertyOptional({ description: "Código da forma de pagamento (-1 quando desconhecida)." })
    codigoFormaPagamento: number;

    @ApiPropertyOptional({ description: "Descrição/tipo da forma de pagamento." })
    tipoPagamento: string;

    @ApiPropertyOptional({ description: "Total de pagamentos realizados nessa forma de pagamento." })
    totalPagamentos: number;

    @ApiPropertyOptional({ description: "Valor total pago nessa forma de pagamento." })
    totalPago: number;
}
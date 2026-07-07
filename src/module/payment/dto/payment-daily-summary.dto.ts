import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class PaymentDailySummaryDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    tipoPagamento?: number;
}
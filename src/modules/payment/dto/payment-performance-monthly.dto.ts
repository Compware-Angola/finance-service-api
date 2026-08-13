import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class PaymentPerformanceMonthlyDto {

    @ApiPropertyOptional({
        example: 23,
        description: 'Ano letivo para análise. Caso não informe usa o ano letivo ativo.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    currentYear: number;


    @ApiPropertyOptional({
        example: 22,
        description: 'Ano letivo para análise. Caso não informe usa o ano letivo anterior.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    previousYear: number;


}
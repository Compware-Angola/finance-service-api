import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    IsInt,
    IsOptional,
    IsPositive,
    IsString,
    IsDateString,
} from "class-validator";

export class PaymentReportDto {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @IsPositive()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @IsPositive()
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    caixaId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    formaPagamento?: number;

    // 👇 NOVOS FILTROS
    @ApiPropertyOptional({
        description: "Data inicial (YYYY-MM-DD)",
        example: "2026-01-01",
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: "Data final (YYYY-MM-DD)",
        example: "2026-01-31",
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}
import { IsInt, IsNotEmpty, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class GetDebtDtoNew {
    @ApiProperty({
        description: 'Código da matrícula (obrigatório)',
        example: 12345,
        required: true,
        type: Number,
    })
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    codigo_matricula: number;
    @ApiProperty({
        description: 'Código do ano letivo (opcional)',
        example: 23,
        required: false,
        type: Number,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    codAnoLectivo?: number;
}
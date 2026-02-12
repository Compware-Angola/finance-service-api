import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateTipoCreditoDto {
    @ApiProperty({
        required: true,
        type: String,
        description: 'Designação do tipo de crédito',
    })
    @IsString()
    @IsNotEmpty()
    designacao: string
    @ApiProperty({
        required: true,
        type: String,
        description: 'Sigla do tipo de crédito',
    })
    @IsString()
    @IsNotEmpty()
    sigla: string
}



export class FilterTipoCreditoDto {
    @ApiPropertyOptional({ description: 'Pesquisa por designação' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    status?: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @Type(() => Boolean) // Garante a conversão para Boolean
    @IsBoolean()
    deleted?: boolean;
}

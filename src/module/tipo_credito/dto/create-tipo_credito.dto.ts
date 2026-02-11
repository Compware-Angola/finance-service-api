import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

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
    @ApiPropertyOptional({
        required: false,
        type: String,
        description: 'Filtra tipos de crédito que contenham este texto na designação',
    })
    search?: string
    @ApiPropertyOptional({
        default: 1,
        required: false,
        type: Number,
        description: 'Número da página (default: 1)',
    })
    page?: number
    @ApiPropertyOptional({
        default: 10,
        required: false,
        type: Number,
        description: 'Quantidade de itens por página (default: 10)',
    })
    limit?: number
}

import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";
import { InvoiceItemDto } from "src/module/invoice/dto/create-invoice-itens.dto";

export class CreateConciliacaoDividaDto {
    @ApiProperty({
        description: 'ID da Fatura.',
        type: Number,
        example: 1
    })
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    InvoiceId: number;

    @ApiProperty({
        description: 'Descrição da conciliação.',
        type: String,
        example: 'Conciliação de pagamento'
    })
    @IsOptional()
    @IsString()
    @Type(() => String)
    descricao?: string;

    // --------------------------------------------------------------------------------
    // ITENS DA FATURA (ARRAY)
    // --------------------------------------------------------------------------------

    @ApiProperty({
        description: 'Lista de pagamentos incluídos na fatura.',
        type: [InvoiceItemDto],
        required: true,
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    itens?: InvoiceItemDto[];

}

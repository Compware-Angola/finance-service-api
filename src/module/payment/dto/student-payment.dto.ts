import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class StudentPaymentsQueryDto extends PaginationQueryDto {

    @ApiPropertyOptional({ description: 'Código da matrícula do aluno', example: 57357 })
    @IsOptional()
    @Type(() => Number)
    codigoMatricula?: number;

    @ApiProperty({ description: 'Código da pré-inscrição', example: 116956 })
    @IsNumber()
    @Type(() => Number)
    codigoPreInscricao: number;

    @ApiProperty({ description: 'Ano lectivo correspondente', example: 21 })
    @IsNumber()
    @Type(() => Number)
    anoLectivo: number;
}



export class StudentPaymentItemDto {
    @ApiProperty({ example: 451853 })
    CodigoFactura: number;

    @ApiProperty({ example: '2024-08-06T08:30:09.000Z' })
    DataFactura: Date;

    @ApiProperty({ example: 50600 })
    TotalPreco: number;

    @ApiProperty({ example: 3542 })
    TotalMulta: number;

    @ApiProperty({ example: 54142 })
    ValorAPagar: number;

    @ApiProperty({ example: null, nullable: true })
    DescricaoFactura: string | null;

    @ApiProperty({ example: 1 })
    EstadoFactura: number;

    @ApiProperty({ example: 'Propina Direito' })
    Servicos: string;

    @ApiProperty({ example: '801076' })
    Pagamentos: string;

    @ApiProperty({ example: 54150 })
    TotalPago: number;
}

export class StudentPaymentResponseDto {
    @ApiProperty({ type: [StudentPaymentItemDto] })
    data: StudentPaymentItemDto[];
    @ApiProperty({ example: 12 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 10 })
    limit: number;

    @ApiProperty({ example: 2 })
    totalPages: number;
}



export class StudentPaymentDetailItemDto {
    @ApiProperty({ example: 421495 })
    CodigoFactura: number;

    @ApiProperty({ example: '2025-01-10T00:00:00.000Z' })
    DataFactura: Date;

    @ApiProperty({ example: 'PROP-2025-0001' })
    Referencia: string;

    @ApiProperty({ example: 1234 })
    CodigoMatricula: number;

    @ApiProperty({ example: 5678, nullable: true })
    CodigoPreInscricao: number | null;

    @ApiProperty({ example: 150000 })
    ValorAPagar: number;

    @ApiProperty({ example: 140000 })
    TotalPreco: number;

    @ApiProperty({ example: 5000 })
    TotalMulta: number;

    @ApiProperty({ example: 5000 })
    TotalIva: number;

    @ApiProperty({
        example: 'Pagamento da propina do 1º semestre',
        nullable: true,
    })
    ObservacaoFactura: string | null;

    @ApiProperty({ example: 'Propina' })
    Servico: string;

    @ApiProperty({ example: 1 })
    Quantidade: number;

    @ApiProperty({ example: 140000 })
    Preco: number;

    @ApiProperty({ example: 5000 })
    ValorIva: number;

    @ApiProperty({ example: 5000 })
    Multa: number;

    @ApiProperty({ example: 150000 })
    Total: number;

    @ApiProperty({ example: 100000 })
    ValorPago: number;
}

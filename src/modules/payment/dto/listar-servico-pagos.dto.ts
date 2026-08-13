import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type TipoPagamento = 'TODOS' | 'MENSALIDADES' | 'SERVICOS';

export class ListarServicosPagosAlunoDto {
    @ApiProperty({ example: 23 })
    @Type(() => Number)
    @IsNumber()
    anoLectivo?: number;

    @ApiProperty({ example: 90885 })
    @Type(() => Number)
    @IsNumber()
    codigoMatricula?: number;

    @ApiPropertyOptional({
        enum: ['TODOS', 'MENSALIDADES', 'SERVICOS'],
        example: 'TODOS',
    })
    @IsOptional()
    @IsIn(['TODOS', 'MENSALIDADES', 'SERVICOS'])
    tipo?: TipoPagamento;
}

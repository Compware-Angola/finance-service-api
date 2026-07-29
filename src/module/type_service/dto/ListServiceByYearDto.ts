import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber } from 'class-validator';

export enum TipoListagemServico {
    MENSALIDADE = 'MENSALIDADE',
    OUTROS = 'OUTROS',
}

export class ListServiceByYearDto {
    @ApiProperty({
        example: 24,
        description: 'Código do ano lectivo',
    })
    @IsNumber()
    @Type(() => Number)
    codigoAnoLectivo: number;

    @ApiProperty({
        enum: TipoListagemServico,
        example: TipoListagemServico.MENSALIDADE,
    })
    @IsEnum(TipoListagemServico)
    tipo: TipoListagemServico;
}
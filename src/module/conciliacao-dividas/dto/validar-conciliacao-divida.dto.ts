
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReconciliacaoDecisaoEnum {
    APROVADO = 'APROVADO',
    REJEITADO = 'REJEITADO',
}

export class ValidarConciliacaoDividaDto {
    @ApiProperty({ enum: ReconciliacaoDecisaoEnum })
    @IsEnum(ReconciliacaoDecisaoEnum, {
        message: 'decisao deve ser APROVADO ou REJEITADO.',
    })
    decisao: ReconciliacaoDecisaoEnum;

    @ApiProperty({
        description: 'Justificação da validação (obrigatória em caso de rejeição).',
        required: false,
    })
    @IsOptional()
    @IsString()
    descricaoValidacao?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export enum ReconciliacaoDecisaoEnum {
    APROVADO = 'APROVADO',
    REJEITADO = 'REJEITADO',
}

export class ValidarConciliacaoDividaDto {
    @ApiPropertyOptional({ enum: [ReconciliacaoDecisaoEnum.APROVADO, ReconciliacaoDecisaoEnum.REJEITADO] })
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
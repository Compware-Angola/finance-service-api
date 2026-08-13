import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoCreditoDto } from './create-tipo_credito.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTipoCreditoDto extends PartialType(CreateTipoCreditoDto) {
    @ApiPropertyOptional({ description: 'Designação do tipo de crédito' })
    designacao?: string

    @ApiPropertyOptional({ description: 'Sigla do tipo de crédito' })
    sigla?: string
}

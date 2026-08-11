import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindBolsaDropdownDto {
    @ApiPropertyOptional({ example: 'Mérito', description: 'Pesquisar por designação' })
    @IsOptional()
    @IsString()
    designacao?: string;


    @ApiPropertyOptional({ example: '1', description: 'Pesquisar por código da instituição' })
    @IsOptional()
    @IsString()
    codigoInstituicao?: string;


}
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindBolsaDropdownDto {
    @ApiPropertyOptional({ example: 'Mérito', description: 'Pesquisar por designação' })
    @IsOptional()
    @IsString()
    designacao?: string;
}
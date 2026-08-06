// dto/find-conciliacao-divida.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class FindConciliacaoDividaDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ['PENDENTE', 'APROVADO', 'REJEITADO'] })
    @IsOptional()
    @IsIn(['PENDENTE', 'APROVADO', 'REJEITADO'])
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    facturaOriginalId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    facturaPropostaId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    createdBy?: number;

    // -------- novos filtros --------
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    codigoAnoLectivo?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    codigoCurso?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    codigoMatricula?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    nome?: string;
}
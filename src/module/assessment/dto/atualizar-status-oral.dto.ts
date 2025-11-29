// src/oral/dto/atualizar-status-oral.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class AtualizarStatusOralDto {
  @ApiProperty({ example: 131, description: 'Código da grade curricular (tgc.CODIGO)' })
  @IsInt()
  @Type(() => Number)
  codigoGrade: number;

  @ApiProperty({ example: true, description: 'true = oral habilitada, false = desabilitada' })
  @IsBoolean()
  habilitar: boolean;
}
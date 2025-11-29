// src/lancamento-notas/dto/estudante-lancamento.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class EstudanteLancamentoDto {
  @ApiProperty({ example: 12345 })
  numeroEstudante: number;

  @ApiProperty({ example: 'João Silva' })
  nome: string;

  @ApiProperty({ example: 12.5 })
  nota?: number;

  @ApiProperty({ example: true })
  podeLancar: boolean;

  @ApiProperty({ example: true })
  cadeirante: boolean;
}
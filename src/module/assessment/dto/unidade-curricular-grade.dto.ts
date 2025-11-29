// src/formulas-uc/dto/unidade-curricular-grade.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UnidadeCurricularGradeDto {
  @ApiProperty({ description: 'Código da grade curricular' })
  codigo: number;

  @ApiProperty({ description: 'Nome da disciplina' })
  disciplina: string;

  @ApiProperty({ description: 'Nota mínima na prática', example: 10 })
  notaMinPratica?: number;

  @ApiProperty({ description: 'Nota mínima na 1ª frequência', example: 9.5 })
  notaMinPrimeiraFreq?: number;

  @ApiProperty({ description: 'Nota mínima na 2ª frequência', example: 9.5 })
  notaMinSegundaFreq?: number;

  @ApiProperty({ description: 'Peso da prática (%)', example: 30 })
  pesoPratica?: number;

  @ApiProperty({ description: 'Peso da 1ª frequência (%)', example: 35 })
  pesoPrimeiraFreq?: number;

  @ApiProperty({ description: 'Peso da 2ª frequência (%)', example: 35 })
  pesoSegundaFreq?: number;
}
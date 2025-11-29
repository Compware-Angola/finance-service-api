// src/oral/dto/definir-oral-grade.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DefinirOralGradeDto {
  @ApiProperty({ example: 131 })
  codigoGrade: number;

  @ApiProperty({ example: 'Matemática Avançada' })
  disciplina: string;

  @ApiProperty({ example: true, description: 'Se a oral está habilitada' })
  habilitar: boolean;

  constructor(codigoGrade: number, disciplina: string, habilitar: boolean) {
    this.codigoGrade = codigoGrade;
    this.disciplina = disciplina;
    this.habilitar = habilitar || false; 
  }
}
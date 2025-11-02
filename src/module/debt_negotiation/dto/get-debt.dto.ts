// src/debt-negotiation/dto/get-debt.dto.ts
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetDebtDto {
  @ApiProperty({ description: 'ID da matrícula do aluno', example: 123 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  matricula: number;

  @ApiProperty({ description: 'ID da pré-inscrição', example: 456 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  preinscricaoId: number;

  @ApiProperty({ description: 'Tipo de candidatura: 1=, 2=, ', example: 2 })
  @IsNumber()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  tipoCandidatura: number;


}
import { IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO responsável por transportar o código da matrícula
 * utilizado para localizar os dados do aluno.
 */
export class FindMatriculaDto {
  /**
   * Código da matrícula do aluno.
   * Utilizado como identificador único da matrícula.
   *
   * @example 260
   */
  @ApiProperty({
    description: 'Código da matrícula do aluno.',
    example: 260,
    required: true,
    type: Number,
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  codigo: number;
}

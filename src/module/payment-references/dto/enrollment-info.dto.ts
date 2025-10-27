import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, IsPositive, ValidateIf } from 'class-validator'

export class EnrollmentInfoDto {
  @ApiProperty({
    description: 'ID da matrícula associada ao pagamento (opcional)',
    example: 1002,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'O ID da matrícula deve ser um número inteiro' })
  @IsPositive({ message: 'O ID da matrícula deve ser positivo' })
  CodigoMatricula?: number

  @ApiProperty({
    description: 'ID da pré-inscrição associada ao pagamento (opcional)',
    example: 501,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'O ID da pré-inscrição deve ser um número inteiro' })
  @IsPositive({ message: 'O ID da pré-inscrição deve ser positivo' })
  codigo_preinscricao?: number
}

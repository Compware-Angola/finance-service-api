import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  ValidateNested,
  IsOptional,
} from 'class-validator'
import { Type } from 'class-transformer'
import { NotifyInfoDto } from './notify-info.dto'
import { EnrollmentInfoDto } from './enrollment-info.dto'

export class CreatePaymentReferenceDto {
  @ApiProperty({
    description: 'O valor total do pagamento',
    example: 100,
  })
  @IsNumber({}, { message: 'O valor deve ser numérico' })
  @IsPositive({ message: 'O valor deve ser maior que zero' })
  amount: number

  @ApiProperty({
    description: 'Moeda usada no pagamento',
    example: 'AOA',
  })
  @IsString({ message: 'A moeda deve ser um texto' })
  @IsNotEmpty({ message: 'A moeda é obrigatória' })
  currency: string

  @ApiProperty({
    description: 'Descrição do pagamento',
    example: 'Teste Mutue 08072025',
  })
  @IsString({ message: 'A descrição deve ser um texto' })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  description: string

  @ApiProperty({
    description: 'Informações de notificação',
    type: () => NotifyInfoDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => NotifyInfoDto)
  @IsOptional()
  notify?: NotifyInfoDto

    @ApiProperty({
    description: 'Informações de matrícula ou pré-inscrição (opcional)',
    type: () => EnrollmentInfoDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => EnrollmentInfoDto)
  @IsOptional()
  enrollment?: EnrollmentInfoDto

}

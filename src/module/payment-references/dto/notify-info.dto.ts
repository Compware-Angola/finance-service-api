import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsEmail, IsBoolean, IsOptional, MaxLength } from 'class-validator'

export class NotifyInfoDto {
  @ApiProperty({
    description: 'Nome da pessoa a ser notificada',
    example: 'Mutue Dev',
  })
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(100, { message: 'O nome não pode ter mais de 100 caracteres' })
  @IsOptional()
  name?: string

  @ApiProperty({
    description: 'Número de telefone para notificação SMS',
    example: '+244923456789',
  })
  @IsString({ message: 'O telefone deve ser uma string' })
  @IsOptional()
  telephone?: string

  @ApiProperty({
    description: 'E-mail para notificação',
    example: 'mutue@exemplo.com',
  })
  @IsEmail({}, { message: 'O e-mail deve ser válido' })
  @IsOptional()
  email?: string

  @ApiProperty({
    description: 'Indica se deve enviar SMS',
    example: false,
  })
  @IsBoolean({ message: 'smsNotification deve ser um valor booleano' })
  @IsOptional()
  smsNotification?: boolean

  @ApiProperty({
    description: 'Indica se deve enviar email',
    example: true,
  })
  @IsBoolean({ message: 'emailNotification deve ser um valor booleano' })
  @IsOptional()
  emailNotification?: boolean
}

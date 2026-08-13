import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyMyCashRegisterDto {
  @ApiProperty({
    example: '123456',
    description: 'Código de abertura do caixa',
  })
  @IsString()
  openingCode: string;
}

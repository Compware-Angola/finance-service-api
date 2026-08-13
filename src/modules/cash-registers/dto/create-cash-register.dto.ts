import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCashRegisterDto {
  @ApiProperty({
    example: 'caixa',
    required: true,
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
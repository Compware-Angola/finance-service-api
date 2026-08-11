import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCashRegisterDto {
  @ApiProperty({
    example: 'caixa',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
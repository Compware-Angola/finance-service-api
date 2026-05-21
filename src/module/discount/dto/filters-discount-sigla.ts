import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterDiscountSiglaDto {
  @ApiProperty({ description: 'Código do desconto', required: true })
  @IsString()
  sigla?: string;
}

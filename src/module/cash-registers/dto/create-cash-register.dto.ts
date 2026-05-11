import { IsString } from 'class-validator';

export class CreateCashRegisterDto {
  @IsString()
  name: string;
}

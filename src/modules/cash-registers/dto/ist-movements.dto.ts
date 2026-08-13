// list-movements.dto.ts
import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListCashRegisterMovementsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['aberto', 'fechado', 'validado', 'rejeitado', 'pendente'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cashRegisterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  operatorId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

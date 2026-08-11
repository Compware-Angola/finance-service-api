import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsIn,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateMovementDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['approved', 'rejected'])
  action: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

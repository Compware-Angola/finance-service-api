import { IsOptional, IsString } from "class-validator";

export class RenewReferenceDto {
  @IsOptional()
  @IsString()
  newAmount?: number;
}

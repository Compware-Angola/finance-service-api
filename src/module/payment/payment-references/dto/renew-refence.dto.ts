import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class RenewReferenceDto {
  
  @ApiPropertyOptional({
    description: 'Novo valor da referência (opcional)',
    example: 15000,   // exemplo mostrado no Swagger
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number) // garante conversão para número mesmo vindo como string no body
  newAmount?: number;
}

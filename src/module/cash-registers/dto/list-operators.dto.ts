import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ListOperatorsDto {
  @ApiPropertyOptional({
    description: 'Search term to filter operators by name or code',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number to paginate the results',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

import { PartialType } from '@nestjs/swagger';
import { CreateIsencaoDto } from './create-isencao.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIsencaoDto extends PartialType(CreateIsencaoDto) {
  @ApiProperty({
    description: 'ACTIVO ou INACTIVO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['Activo', 'Inactivo'])
  estadoIsencao?: string;
}

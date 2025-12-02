// src/room/dto/create-room.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Nome ou designação da sala',
    example: 'Laboratório de Informática 01',
  })
  @IsString({ message: 'A designação deve ser um texto' })
  @IsNotEmpty({ message: 'A designação é obrigatória' })
  @Length(3, 100)
  designacao: string;

  @ApiProperty({
    description: 'Tipo da sala',
    example: 1,
  
  })
  @IsNumber()
  @IsNotEmpty()
  tipo_sala: number;

  @ApiProperty({
    description: 'Número identificador da sala (ex: A101, B-205)',
    example: 'B-205',
  })
  @IsString()
  @IsNotEmpty()

  numero: string;

  @ApiPropertyOptional({
    description: 'Estado atual da sala',
    example: 'livre',
    
    default: 'livre',
  })
  @IsOptional()
  @IsString()
  
  estado?: string;

  @ApiProperty({
    description: 'Capacidade normal da sala (número de alunos)',
    example: 40,
  })
  @IsNumber()
  @IsPositive({ message: 'A capacidade deve ser maior que zero' })
  capacidade: number;

  @ApiProperty({
    description: 'ID do pólo/campus',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  polo_id: number;

  @ApiProperty({
    description: 'ID do piso',
    example: 2,
  })
  @IsNumber()
  @IsPositive()
  piso_id: number;

  @ApiProperty({
    description: 'ID do edifício',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  edificio_id: number;

  @ApiPropertyOptional({
    description: 'Comprimento da sala em metros',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber()
  comprimento?: number;

  @ApiPropertyOptional({
    description: 'Largura da sala em metros',
    example: 8.0,
  })
  @IsOptional()
  @IsNumber()
  largura?: number;

  @ApiPropertyOptional({
    description: 'Área total da sala (m²)',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  area?: number;

  @ApiPropertyOptional({ description: 'Número de aparelhos de ar condicionado', example: 3 })
  @IsOptional()
  @IsNumber()
  num_ac?: number;

  @ApiPropertyOptional({ description: 'Número de lâmpadas', example: 20 })
  @IsOptional()
  @IsNumber()
  num_lampadas?: number;

  @ApiPropertyOptional({ description: 'Número de janelas', example: 8 })
  @IsOptional()
  @IsNumber()
  num_janelas?: number;

  @ApiPropertyOptional({
    description: 'Área por aluno (m²)',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  area_aluno?: number;

  @ApiPropertyOptional({
    description: 'Sala utilizável?',
    example: 'SIM',
    enum: ['SIM', 'NÃO'],
    default: 'SIM',
  })
  @IsOptional()

  utilizavel?:string;

  @ApiPropertyOptional({
    description: 'Capacidade especial para exame/acesso prova',
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  capacidade_exame_acesso_prova?: number;

}
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddDiscountDto {
  @ApiProperty({ description: 'Observação do desconto' })
  @IsNotEmpty()
  @IsString()
  observacao: string;

  @ApiProperty({ description: 'Codigo da matricula' })
  @IsNotEmpty()
  @IsNumber()
  codigoMatricula: number;

  @ApiProperty({ description: 'Codigo da taxa' })
  @IsNotEmpty()
  @IsNumber()
  codigoTaxa: number;

  @ApiProperty({ description: 'Código da Instituição' })
  @IsNotEmpty()
  @IsNumber()
  codigoInstituicao: number;

  @ApiProperty({ description: 'Codigo da ano' })
  @IsNotEmpty()
  @IsNumber()
  codigoAno: number;

  @ApiProperty({ description: 'Semestre' })
  @IsNotEmpty()
  @IsNumber()
  semestre: number;
}

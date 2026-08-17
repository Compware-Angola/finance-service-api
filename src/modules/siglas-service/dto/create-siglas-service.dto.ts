import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateSiglaTipoServicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sigla!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  descricao!: string;

  @IsNumber()
  @IsNotEmpty()
  tipo_candidatura!: number;
}

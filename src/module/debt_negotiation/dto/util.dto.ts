import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { Optional } from '@nestjs/common';

// === ITEM DE MENSALIDADE ===
export class MensalidadeItemDto {
  

  // Campos Opcionais
  @ApiProperty({ description: 'Código da Grade Curricular.', "required": false, "default": '' })
  @IsString()
  @IsOptional()
  codGradeCurricular?: string; 

  @ApiProperty({ description: 'Código da Factura Outros Serviços.', "required": false, "default": '' })
  @IsString()
  @IsOptional()
  codFacturaOutrosServicos?: string; 

  @ApiProperty({ description: 'Bolsa de estudo.', "required": false, "default": '' })
  @IsString()
  @IsOptional()
  bolsa?: string; 

  @ApiProperty({ description: 'ID temporário do mês (e.g., 260).', "required": false, "type": Number })
  @IsInt()
  @IsOptional()
  mes_temp_id?: number; 

  @ApiProperty({ description: 'Número da prestação (e.g., 10).', "required": false, "type": Number })
  @IsInt()
  @IsOptional()
  n_prestacao?: number; 
  
  // Campos Obrigatórios e Tipagem
  @ApiProperty({ description: 'Valor em string formatada (e.g., "46000.00").' })
  @IsString()
  valor: string; 

  @ApiProperty({ description: 'Valor da multa.', "type": Number })
  @IsNumber()
  multa: number; 

  @ApiProperty({ description: 'Total do item.', "type": Number })
  @IsNumber()
  total: number; 

  @ApiProperty({ description: 'Descrição do serviço (e.g., "Propina Fisioterapia").' })
  @IsString()
  servico: string; 

  @ApiProperty({ description: 'Mês da propina (e.g., "JUL-2024").' })
  @IsString()
  mes_propina: string; 

  @ApiProperty({ description: 'Ano letivo (e.g., "2023-2024").' })
  @IsString()
  ano_lectivo: string; 

  @ApiProperty({ description: 'Taxa de multa.', "type": Number })
  @IsNumber()
  taxa_multa: number; 

  @ApiProperty({ description: 'Taxa de desconto.', "type": Number })
  @IsNumber()
  taxa_desconto: number; 

  @ApiProperty({ description: 'Código da propina (e.g., 6446).', "type": Number })
  @IsInt()
  codigo_propina: number; 

  @ApiProperty({ description: 'Código do ano letivo (e.g., 21).', "type": Number })
  @IsInt()
  codigo_anoLectivo: number; 

  @ApiProperty({ description: 'Valor do desconto.', "type": Number })
  @IsNumber()
  desconto: number; 

  @ApiProperty({ description: 'Incidência.', "type": Number })
  @IsNumber()
  incidencia: number; 

  @ApiProperty({ description: 'Valor do IVA.', "type": Number })
  @IsNumber()
  valor_iva: number; 

  @ApiProperty({ description: 'Tipo de taxas.', "type": Number })
  @IsInt()
  tipo_taxas: number; 

  @ApiProperty({ description: 'Descrição da taxa.', "type": String, "default": '' })
  @IsString()
  taxa_descricao: string; 
}

// === ITEM DE SERVIÇO ===

export class ServicoItemDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @Optional()
  codGradeCurricular?: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @Optional()
  codFacturaOutrosServicos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  codigo_propina?: string;

  @ApiProperty()
  @IsString()
  codidigo_servico: string;

  @ApiProperty()
  @IsString()
  codigo_anoLectivo: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  valor: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  multa: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  total: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  taxa_multa: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  taxa_desconto: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  desconto: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  incidencia: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  valor_iva: number;

  @ApiProperty()
  @IsString()
  servico: string;

  @ApiProperty({ default: '' })
  @IsString()
  mes_propina: string;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  n_prestacao?: string;

  @ApiProperty()
  @IsString()
  ano_lectivo: string;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  bolsa?: string;

  @ApiProperty()
  @IsString()
  taxa_descricao: string;

  @ApiProperty({ type: Number, nullable: true, required: false })
  @ValidateIf(o => o.mes_temp_id !== undefined)
  @IsOptional()
  @Type(() => Number)
  mes_temp_id?: number | null;

  // 🔹 Campos extras opcionais (não quebram validação)
  @ApiProperty({ required: false, description: 'Campos extras opcionais, como tipo_taxas' })
  @IsOptional()
  tipo_taxas?: string;

  // 🔹 Também pode permitir outros campos extras sem erro
  [key: string]: any;
}

// === UNIÃO DOS DOIS PARA O SWAGGER (Sem ser uma classe real, "mas" tipagem) ===
// NOTA: Para usar este tipo de união em um array em outro DTO (ex: items: FaturaItemUnion[]),
// você precisa usar o decorador @ApiProperty com a propriedade 'oneOf' no DTO pai.

// Exemplo de como usar em um DTO "Pai" (e.g., "um" DTO de Fatura Completa):

// export class CreateFaturaDto {
//   // ... outros campos ...

//   @ApiExtraModels(MensalidadeItemDto, ServicoItemDto) // Garante que os modelos sejam gerados
//   @ApiProperty({
//     description: 'Lista de itens da fatura (Mensalidade ou Serviço)',
//     isArray: true,
//     oneOf: [ // Define a União de Tipos no Swagger
//       { $ref: getSchemaPath(MensalidadeItemDto) },
//       { $ref: getSchemaPath(ServicoItemDto) },
//     ],
//   })
//   @Type(() => MensalidadeItemDto, { // O Type não suporta union nativamente.
//     discriminator: {              // Deve-se usar o discriminator para o class-transformer
//       property: 'tipo_item',
//       subTypes: [
//         { value: MensalidadeItemDto, "name": ItemType.MENSALIDADE },
//         { value: ServicoItemDto, "name": ItemType.SERVICO },
//       ],
//     },
//   })
//   // O tipo abaixo permite a validação pelo class-validator se for usado em uma propriedade @ValidateNested({ each: true })
//   items: (MensalidadeItemDto | ServicoItemDto)[];

//   // ...
// }

// A tipagem original para uso em código Typescript permanece
export type FaturaItemUnion = MensalidadeItemDto | ServicoItemDto;
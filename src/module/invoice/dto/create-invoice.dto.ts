import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsPositive, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  
  // OBRIGATÓRIOS (NOT NULL)
  // --------------------------------------------------------------------------------

  /**
   * Data e hora de emissão da fatura.
   * Campo NOT NULL.
   */
  @ApiProperty({ 
    description: 'Data e hora de emissão da fatura.', 
    type: String, 
    format: 'date-time',
    example: "2025-10-24T10:00:00.000Z" // Exemplo movido para cá
  })
  @IsNotEmpty()
  @IsDateString()
  DataFactura: string;

  /**
   * ID do Polo (Unidade) ao qual a fatura pertence.
   * Campo NOT NULL.
   */
  @ApiProperty({ 
    description: 'ID do Polo (Unidade) ao qual a fatura pertence.', 
    type: Number, 
    required: true,
    example: 1 // Exemplo movido para cá
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  polo_id: number;

  /**
   * Valor total da fatura antes de multas/IVA/etc.
   * Campo NOT NULL.
   */
  @ApiProperty({ 
    description: 'Valor total da fatura.', 
    type: Number,
    example: 15000.50 // Exemplo movido para cá
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  TotalPreco: number;

  // --------------------------------------------------------------------------------
  // RELACIONAMENTOS (Um deles deve ser fornecido)
  // --------------------------------------------------------------------------------

  /**
   * ID da Matrícula relacionada (opcional, pode ser fornecido se não for pré-inscrição).
   */
  @ApiProperty({ 
    description: 'ID da Matrícula relacionada.', 
    type: Number, 
    required: false,
    example: 1002 // Exemplo movido para cá
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  CodigoMatricula?: number;

  /**
   * ID da Pré-Inscrição relacionada (opcional, se não for matrícula).
   */
  @ApiProperty({ 
    description: 'ID da Pré-Inscrição relacionada.', 
    type: Number, 
    required: false,
    example: 501 // Exemplo movido para cá
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  codigo_preinscricao?: number;

  // --------------------------------------------------------------------------------
  // DETALHES FINANCEIROS E DESCRIÇÃO (Valores que podem ser fornecidos)
  // --------------------------------------------------------------------------------

  /**
   * Valor do Desconto aplicado.
   */
  @ApiProperty({ 
    description: 'Valor do Desconto aplicado.', 
    type: Number, 
    required: false, 
    default: 0,
    example: 500.00 // Exemplo movido para cá
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  Desconto?: number = 0;

  /**
   * Valor total do Imposto (IVA).
   */
  @ApiProperty({ 
    description: 'Valor total do IVA.', 
    type: Number, 
    required: false, 
    default: 0,
    example: 2700.00 // Exemplo movido para cá
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalIVA?: number = 0;

  /**
   * Valor total de Multas.
   */
  @ApiProperty({ 
    description: 'Valor total de Multas.', 
    type: Number, 
    required: false, 
    default: 0,
    example: 0.00 // Exemplo movido para cá
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  TotalMulta?: number = 0;
  
  /**
   * Descrição da fatura ou serviços.
   */
  @ApiProperty({ 
    description: 'Descrição da fatura ou serviços.', 
    type: String, 
    required: false, 
    maxLength: 500,
    example: "Pagamento da propina referente ao mês de Outubro." // Exemplo movido para cá
  })
  @IsOptional()
  @IsString()
  Descricao?: string;


  /**
   * ID do tipo de documento de faturação (ex: Fatura, Fatura Simplificada, etc.).
   */
  @ApiProperty({ 
    description: 'ID do tipo de documento de faturação.', 
    type: Number, 
    required: false,
    example: 1 // Exemplo movido para cá
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  tipo_documento_factura_id?: number;

  // --------------------------------------------------------------------------------
  // CAMPOS COM VALOR PADRÃO GERALMENTE CALCULADOS OU PREENCHIDOS PELO SISTEMA
  // (Deixados opcionais, mas o sistema deve preencher se não fornecidos)
  // --------------------------------------------------------------------------------
  
  /**
   * Ano Letivo relacionado.
   */
  @ApiProperty({ 
    description: 'Ano Letivo relacionado.', 
    type: Number, 
    required: false, 
    default: 1,
    example: 1 // Exemplo movido para cá
  })
  @IsOptional()
  @IsInt()
  ano_lectivo?: number = 1;
  
  /**
   * Canal de comunicação (3 é o padrão).
   */
  @ApiProperty({ 
    description: 'Canal de comunicação (3 é o padrão).', 
    type: Number, 
    required: false, 
    default: 3,
    example: 3 // Exemplo movido para cá
  })
  @IsOptional()
  @IsInt()
  canal?: number = 3;
}
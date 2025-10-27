import {  IsNumber, IsString, Length, IsDate, IsOptional, IsDateString, IsIn } from 'class-validator';

export enum PaymentReferenceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELED = 'CANCELED',
  PAID = 'PAID',
  ERROR = 'ERROR',
}

/**
 * DTO para a criação de uma nova referência de pagamento.
 * Inclui validações básicas usando 'class-validator'.
 */
export class RegisterPaymentReferenceDto {
@IsOptional()
  @IsNumber({}, { message: 'O ID do pagamento (paymentId) deve ser um número.' })
  readonly paymentId?: number;

  @IsOptional()
  @IsString({ message: 'O código da fonte (sourceId) deve ser uma string.' })
  @Length(1, 50, { message: 'O código da fonte (sourceId) deve ter entre 1 e 50 caracteres.' })
  readonly sourceId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O código da factura (facturaCodigo) deve ser um número inteiro.' })
  readonly facturaCodigo?: number;

  @IsOptional()
  @IsString({ message: 'O identificador da entidade (entityId) deve ser uma string.' })
  @Length(1, 50, { message: 'O identificador da entidade (entityId) deve ter entre 1 e 50 caracteres.' })
  readonly entityId?: string;

  @IsOptional()
  @IsString({ message: 'A referência (reference) deve ser uma string.' })
  @Length(1, 100, { message: 'A referência (reference) deve ter entre 1 e 100 caracteres.' })
  readonly reference?: string;

  @IsOptional()
  @IsString({ message: 'O ID da referência (referenceId) deve ser uma string.' })
  @Length(1, 250, { message: 'O ID da referência (referenceId) deve ter no máximo 250 caracteres.' })
  readonly referenceId?: string;

  @IsOptional()
  @IsString({ message: 'O ID da transação (merchantTransactionId) deve ser uma string.' })
  @Length(1, 250, { message: 'O ID da transação (merchantTransactionId) deve ter no máximo 250 caracteres.' })
  readonly merchantTransactionId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'O valor (amount) deve ser um número.' })
  readonly amount?: number;

  @IsOptional()
  @IsDateString({}, { message: 'A data de início (startDate) deve ser uma data válida no formato ISO 8601.' })
  readonly startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'A data de fim (endDate) deve ser uma data válida no formato ISO 8601.' })
  readonly endDate?: string;

  @IsOptional()
  @IsString({ message: 'O estado (status) deve ser uma string.' })
  @IsIn(Object.values(PaymentReferenceStatus), { message: 'O estado (status) deve ser um valor válido: ACTIVE, INACTIVE, CANCELED, PAID, ERROR.' })
  readonly status?: string;
  @IsOptional()
  @IsString({ message: 'O webhook deve ser uma string (texto).' })
  readonly webhook?: string;

}
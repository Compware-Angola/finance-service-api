
import { IsNotEmpty, IsNumber, IsOptional, IsArray, IsString, IsIn, ValidateNested, Validate, ValidatorConstraint, ValidateIf } from 'class-validator';
import { FaturaItemUnion, MensalidadeItemDto, ServicoItemDto } from './util.dto';
import { Type } from 'class-transformer';

export type TipoPagamento = 'TOTAL' | 'PARCIAL';
@ValidatorConstraint({ name: 'isFaturaItemUnion', async: false })
export class IsFaturaItemUnionConstraint {
  validate(value: any) {
    return value && (
      (value.tipo === 'MENSALIDADE' && 'mes_propina' in value && 'codigo_propina' in value) ||
      (value.tipo === 'SERVICO' && 'codigo_servico' in value && 'descricao' in value)
    );
  }

  defaultMessage() {
    return 'Cada item deve ser MENSALIDADE (com mes_propina, codigo_propina) ou SERVICO (com codigo_servico, descricao)';
  }
}
export class CreateDebtNegotiationDto {


  // totalDivida
  @IsNotEmpty()
  @IsNumber()
  totalDivida: number;

  // descontoTotal (dto.desconto || 0)
  @IsOptional()
  @IsNumber()
  desconto: number;

  // precoTotal
  @IsNotEmpty()
  @IsNumber()
  precoTotal: number;

  // total_retencao
  @IsNotEmpty()
  @IsNumber()
  total_retencao: number;

  // total_incidencia
  @IsNotEmpty()
  @IsNumber()
  total_incidencia: number;

  // totalIVA
  @IsNotEmpty()
  @IsNumber()
  totalIVA: number;

  // saldo_reset (dto.saldo_reset || 0)
  @IsOptional()
  @IsNumber()
  saldo_reset: number;

  // NOVO CAMPO: tipoPagamento
  @IsNotEmpty()
  @IsString()
  // Garante que o valor recebido seja "TOTAL" ou "PARCIAL"
  @IsIn(['TOTAL', 'PARCELADO'], { message: 'O tipoPagamento deve ser TOTAL ou PARCELADO' })
  tipoPagamento: TipoPagamento;

  fatura_item_mensalidades: MensalidadeItemDto[]
  fatura_item_servicos: ServicoItemDto[]
  // Obrigatório apenas se PARCELADO
  @ValidateIf(o => o.tipoPagamento === 'PARCELADO')
  @IsNumber()
  valor_pago_na_hora!: number;

}
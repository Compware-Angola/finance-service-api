import { PartialType } from '@nestjs/mapped-types';

import { CreateFormaPagamentoDto } from './create-forma-pagamento.dto';

export class UpdateFormaPagamentoDto extends PartialType(
  CreateFormaPagamentoDto,
) {}

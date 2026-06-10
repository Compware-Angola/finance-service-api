import { PartialType } from '@nestjs/swagger';
import { CreatePagamentosBolsaInstituicaoDto } from './create-pagamentos_bolsa_instituicao.dto';

export class UpdatePagamentosBolsaInstituicaoDto extends PartialType(CreatePagamentosBolsaInstituicaoDto) {}

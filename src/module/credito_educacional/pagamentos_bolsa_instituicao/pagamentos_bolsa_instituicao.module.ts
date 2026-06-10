import { Module } from '@nestjs/common';
import { PagamentosBolsaInstituicaoService } from './pagamentos_bolsa_instituicao.service';
import { PagamentosBolsaInstituicaoController } from './pagamentos_bolsa_instituicao.controller';

@Module({
  controllers: [PagamentosBolsaInstituicaoController],
  providers: [PagamentosBolsaInstituicaoService],
})
export class PagamentosBolsaInstituicaoModule {}

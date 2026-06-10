import { Module } from '@nestjs/common';
import { PagamentosBolsaInstituicaoService } from './pagamentos_bolsa_instituicao.service';
import { PagamentoBolsaController } from './pagamentos_bolsa_instituicao.controller';

@Module({
  controllers: [PagamentoBolsaController],
  providers: [PagamentosBolsaInstituicaoService],
})
export class PagamentosBolsaInstituicaoModule { }

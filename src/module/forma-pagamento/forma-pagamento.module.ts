import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FormaPagamentoEntity } from './entities/forma-pagamento.entity';

import { FormaPagamentoController } from './forma-pagamento.controller';
import { FormaPagamentoService } from './forma-pagamento.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormaPagamentoEntity])],

  controllers: [FormaPagamentoController],

  providers: [FormaPagamentoService],

  exports: [FormaPagamentoService],
})
export class FormaPagamentoModule {}

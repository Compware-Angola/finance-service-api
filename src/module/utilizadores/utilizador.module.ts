import { Module } from '@nestjs/common';
import { UtilizadorController } from './utilizador.controller';
import { UtilizadorService } from './utilizador.service';

@Module({
  controllers: [UtilizadorController],
  providers: [UtilizadorService],
})
export class UtilizadorModule {}

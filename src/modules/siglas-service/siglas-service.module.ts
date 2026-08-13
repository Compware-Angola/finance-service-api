// sigla-tipo-servicos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiglaTipoServico } from './entities/siglas-service.entity';
import { SiglaTipoServicosController } from './siglas-service.controller';
import { SiglaTipoServicosService } from './siglas-service.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiglaTipoServico])],
  controllers: [SiglaTipoServicosController],
  providers: [SiglaTipoServicosService],
  exports: [SiglaTipoServicosService],
})
export class SiglaTipoServicosModule {}

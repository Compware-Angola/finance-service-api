import { Module } from '@nestjs/common';
import { TipoCreditoService } from './tipo_credito.service';
import { TipoCreditoController } from './tipo_credito.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoCredito } from './entities/tipo_credito.entity';



@Module({
  imports: [TypeOrmModule.forFeature([TipoCredito])],
  providers: [TipoCreditoService],
  controllers: [TipoCreditoController],
})
export class TipoCreditoModule { }
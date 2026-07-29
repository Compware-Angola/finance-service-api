import { Module } from '@nestjs/common';
import { ConciliacaoDividasService } from './conciliacao-dividas.service';
import { ConciliacaoDividasController } from './conciliacao-dividas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from 'src/module/invoice/entities/invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])],
  controllers: [ConciliacaoDividasController],
  providers: [ConciliacaoDividasService],
})
export class ConciliacaoDividasModule { }

import { Module } from '@nestjs/common';
import { IsencaoService } from './isencao.service';
import { IsencaoController } from './isencao.controller';
import { IsencaoServiceMulta } from './isencao-multa.service';

@Module({
  controllers: [IsencaoController],
  providers: [IsencaoService, IsencaoServiceMulta],
  exports: [IsencaoService],
})
export class IsencaoModule {}

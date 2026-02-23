import { Module } from '@nestjs/common';
import { IsencaoService } from './isencao.service';
import { IsencaoController } from './isencao.controller';

@Module({
  controllers: [IsencaoController],
  providers: [IsencaoService],
  exports: [IsencaoService],
})
export class IsencaoModule {}

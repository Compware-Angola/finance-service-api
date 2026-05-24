import { Module } from '@nestjs/common';
import { CreditoEducacionalService } from './credito_educacional.service';
import { CreditoEducacionalController } from './credito_educacional.controller';

@Module({
  controllers: [CreditoEducacionalController],
  providers: [CreditoEducacionalService],
})
export class CreditoEducacionalModule {}

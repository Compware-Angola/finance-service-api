import { Module } from '@nestjs/common';
import { ExemptDaysService } from './exempt_days.service';
import { ExemptDaysController } from './exempt_days.controller';

@Module({
  controllers: [ExemptDaysController],
  providers: [ExemptDaysService],
})
export class ExemptDaysModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullConnectionFactory } from 'src/common/config/redis-connection.factory';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
  ],
  exports: [BullModule],
})
export class BullConfigModule {}

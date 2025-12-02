import { Module } from '@nestjs/common';
import { RoomService } from './roon.service';
import { RoonController } from './roon.controller';

@Module({
  controllers: [RoonController],
  providers: [RoomService],
})
export class RoonModule {}

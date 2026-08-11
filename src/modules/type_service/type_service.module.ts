import { Module } from '@nestjs/common';
import { TypeServiceService } from './type_service.service';
import { TypeServiceController } from './type_service.controller';

@Module({
  controllers: [TypeServiceController],
  providers: [TypeServiceService],
})
export class TypeServiceModule {}

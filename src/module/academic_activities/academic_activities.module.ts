import { Module } from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { AcademicActivitiesController } from './academic_activities.controller';

@Module({
  controllers: [AcademicActivitiesController],
  providers: [AcademicActivitiesService],
})
export class AcademicActivitiesModule {}

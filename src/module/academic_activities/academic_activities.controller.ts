import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AcademicActivitiesService } from './academic_activities.service';
import { CreateAcademicActivityDto } from './dto/create-academic_activity.dto';
import { UpdateAcademicActivityDto } from './dto/update-academic_activity.dto';

@Controller('academic-activities')
export class AcademicActivitiesController {
  constructor(private readonly academicActivitiesService: AcademicActivitiesService) {}


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.academicActivitiesService.deleteAcademicActivities(+id);
  }
}

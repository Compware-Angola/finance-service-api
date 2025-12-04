import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TeacherService } from './teacher.service';


@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.profile(+id);
  }

}

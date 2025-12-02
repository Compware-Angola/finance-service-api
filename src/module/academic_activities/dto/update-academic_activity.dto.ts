import { PartialType } from '@nestjs/swagger';
import { CreateAcademicActivityDto } from './create-academic_activity.dto';

export class UpdateAcademicActivityDto extends PartialType(CreateAcademicActivityDto) {}

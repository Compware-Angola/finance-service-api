import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [    TypeOrmModule.forFeature([
  
        AcademicYear,
     
      ]),],
  controllers: [AssessmentController],
  providers: [AssessmentService,AnoLectivoUtil],
})
export class AssessmentModule {}

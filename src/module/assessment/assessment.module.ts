import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { AcademicYear } from '../invoice/entities/academic.year.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { DefineFormulaUcOralService } from './define_formula_uc_oral.service';
import { NoteReleaseService } from './note_release.service';

@Module({
  imports: [    TypeOrmModule.forFeature([
  
        AcademicYear,
     
      ]),],
  controllers: [AssessmentController],
  providers: [AssessmentService,AnoLectivoUtil, DefineFormulaUcService, DefineFormulaUcOralService,NoteReleaseService],
})
export class AssessmentModule {}

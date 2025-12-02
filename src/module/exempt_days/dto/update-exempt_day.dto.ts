import { PartialType } from '@nestjs/swagger';
import { CreateExemptDayDto } from './create-exempt_day.dto';

export class UpdateExemptDayDto extends PartialType(CreateExemptDayDto) {}

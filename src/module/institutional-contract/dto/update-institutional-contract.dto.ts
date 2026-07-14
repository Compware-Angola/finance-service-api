import { PartialType } from '@nestjs/swagger';
import { CreateInstitutionalContractDto } from './create-institutional-contract.dto';

export class UpdateInstitutionalContractDto extends PartialType(CreateInstitutionalContractDto) {}

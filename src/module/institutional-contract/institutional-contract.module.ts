import { Module } from '@nestjs/common';
import { InstitutionalContractService } from './institutional-contract.service';
import { InstitutionalContractController } from './institutional-contract.controller';

@Module({
  controllers: [InstitutionalContractController],
  providers: [InstitutionalContractService],
})
export class InstitutionalContractModule {}

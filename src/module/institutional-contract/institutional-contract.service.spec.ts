import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionalContractService } from './institutional-contract.service';

describe('InstitutionalContractService', () => {
  let service: InstitutionalContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstitutionalContractService],
    }).compile();

    service = module.get<InstitutionalContractService>(InstitutionalContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

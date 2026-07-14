import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionalContractController } from './institutional-contract.controller';
import { InstitutionalContractService } from './institutional-contract.service';

describe('InstitutionalContractController', () => {
  let controller: InstitutionalContractController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionalContractController],
      providers: [InstitutionalContractService],
    }).compile();

    controller = module.get<InstitutionalContractController>(InstitutionalContractController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

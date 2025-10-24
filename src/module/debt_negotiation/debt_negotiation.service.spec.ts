import { Test, TestingModule } from '@nestjs/testing';
import { DebtNegotiationService } from './debt_negotiation.service';

describe('DebtNegotiationService', () => {
  let service: DebtNegotiationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DebtNegotiationService],
    }).compile();

    service = module.get<DebtNegotiationService>(DebtNegotiationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

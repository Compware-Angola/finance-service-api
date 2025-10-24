import { Test, TestingModule } from '@nestjs/testing';
import { DebtNegotiationController } from './debt_negotiation.controller';
import { DebtNegotiationService } from './debt_negotiation.service';

describe('DebtNegotiationController', () => {
  let controller: DebtNegotiationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtNegotiationController],
      providers: [DebtNegotiationService],
    }).compile();

    controller = module.get<DebtNegotiationController>(DebtNegotiationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

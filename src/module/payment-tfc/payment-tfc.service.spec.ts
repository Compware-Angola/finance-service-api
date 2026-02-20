import { Test, TestingModule } from '@nestjs/testing';
import { PaymentTfcService } from './payment-tfc.service';

describe('PaymentTfcService', () => {
  let service: PaymentTfcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentTfcService],
    }).compile();

    service = module.get<PaymentTfcService>(PaymentTfcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

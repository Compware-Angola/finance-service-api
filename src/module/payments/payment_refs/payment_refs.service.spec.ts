import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRefsService } from './payment_refs.service';

describe('PaymentRefsService', () => {
  let service: PaymentRefsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentRefsService],
    }).compile();

    service = module.get<PaymentRefsService>(PaymentRefsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

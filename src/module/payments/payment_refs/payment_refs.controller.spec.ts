import { Test, TestingModule } from '@nestjs/testing';
import { PaymentRefsController } from './payment_refs.controller';
import { PaymentRefsService } from './payment_refs.service';

describe('PaymentRefsController', () => {
  let controller: PaymentRefsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentRefsController],
      providers: [PaymentRefsService],
    }).compile();

    controller = module.get<PaymentRefsController>(PaymentRefsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

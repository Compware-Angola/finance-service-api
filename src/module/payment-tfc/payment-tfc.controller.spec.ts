import { Test, TestingModule } from '@nestjs/testing';
import { PaymentTfcController } from './payment-tfc.controller';
import { PaymentTfcService } from './payment-tfc.service';

describe('PaymentTfcController', () => {
  let controller: PaymentTfcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentTfcController],
      providers: [PaymentTfcService],
    }).compile();

    controller = module.get<PaymentTfcController>(PaymentTfcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

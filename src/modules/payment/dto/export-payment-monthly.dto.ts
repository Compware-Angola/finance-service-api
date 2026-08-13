import { OmitType } from '@nestjs/swagger';
import { FindPaymentMonthlyDTO } from './find-payment-monthly.dto';

export class ExportPaymentMonthlyDTO extends OmitType(
  FindPaymentMonthlyDTO,
  ['page', 'limit'] as const,
) {}

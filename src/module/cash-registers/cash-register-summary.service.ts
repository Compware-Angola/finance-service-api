import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CashRegistersService } from './cash-registers.service';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { InjectRepository } from '@nestjs/typeorm';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';
import { CashRegisterStatus } from './enums/cash-register-status.enum';

@Injectable()
export class CashRegisterSummaryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cashRegistersService: CashRegistersService,
    @InjectRepository(CashRegisterMovement)
    private readonly movementRepository: Repository<CashRegisterMovement>,
  ) {}

  async getPaymentMethodSummary(params: {
    operatorId: number;
    cashRegisterId: number;
  }) {
    const { operatorId, cashRegisterId } = params;
    const cashRegister = await this.movementRepository.findOne({
      where: {
        cashRegisterId,
        operatorId,
        status: CashRegisterStatus.OPEN,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new BadRequestException('Caixa não encontrado');
    }

    const paymentSummary = await this.dataSource.query(
      `SELECT
    forma_pagamento.CODIGO    AS forma_pagamento_codigo,
    forma_pagamento.DESCRICAO AS forma_pagamento,
    SUM(pagamentos.VALOR_DEPOSITADO) AS total
  FROM FK2_TB_PAGAMENTOS pagamentos
  INNER JOIN FK2_TB_FORMA_PAGAMENTO forma_pagamento
    ON forma_pagamento.CODIGO = pagamentos.FORMA_PAGAMENTO
  WHERE pagamentos.FK_UTILIZADOR = :1
    AND pagamentos.CAIXA_ID      = :2
    AND pagamentos.ESTADO        = 2
    AND pagamentos.CREATED_AT   >= :3
  GROUP BY
    forma_pagamento.CODIGO,
    forma_pagamento.DESCRICAO
  ORDER BY forma_pagamento.DESCRICAO
  `,
      [operatorId, cashRegisterId, cashRegister.createdAt],
    );

    const summary = toLowerCaseKeys(paymentSummary);

    return {
      summary,
      openingAmount: cashRegister.openingAmount ?? 0,
    };
  }

  async getMySummary(operatorId: number) {
    const cashRegister =
      await this.cashRegistersService.validateOperatorOpenCashRegister(
        operatorId,
      );

    if (!cashRegister) {
      throw new BadRequestException('Operador não possui caixa aberto');
    }

    return this.getPaymentMethodSummary({
      operatorId,
      cashRegisterId: cashRegister.id,
    });
  }
}

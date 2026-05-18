import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, DataSource, IsNull, Repository } from 'typeorm';

import { CashRegister } from './entities/cash-register.entity';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';

import { ListCashRegistersDto } from './dto/list-cash-registers.dto';

import { OpenCashRegisterParams } from './types';

import {
  CashRegisterStatus,
  PaymentMethod,
  YesNo,
} from './enums/cash-register-status.enum';
import { randomInt } from 'crypto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListOperatorsDto } from './dto/list-operators.dto';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,

    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: ListCashRegistersDto) {
    const { page = 1, limit = 10 } = filters || {};
    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'C.CODIGO AS code',
        'C.NOME AS name',
        'C.STATUS_ AS status',
        'C.CODE AS opening_code',
        'C.BLOQUEIO AS blocked',
        'UTI.PK_UTILIZADOR AS operator_code',
        'UTI.NOME AS operator_name',
      ])
      .from('FK2_TB_CAIXAS', 'C')
      .leftJoin(
        'FK2_MCA_TB_UTILIZADOR',
        'UTI',
        'UTI.PK_UTILIZADOR = C.OPERADOR_ID',
      )
      .where('C.DELETED_AT IS NULL');

    if (filters?.search?.trim()) {
      const search = `%${filters.search.trim().toUpperCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(C.NOME) LIKE UPPER(:search)', { search }).orWhere(
            'UPPER(UTI.NOME) LIKE UPPER(:search)',
            { search },
          );
        }),
      );
    }

    if (filters?.status) {
      queryBuilder.andWhere('C.STATUS_ = :status', { status: filters.status });
    }

    if (filters?.blocked) {
      queryBuilder.andWhere('C.BLOQUEIO = :blocked', {
        blocked: filters.blocked,
      });
    }

    const countQueryBuilder = queryBuilder.clone();

    queryBuilder.orderBy('C.CODIGO', 'DESC').offset(offset).limit(limit);
    const [results, totalResult] = await Promise.all([
      queryBuilder.getRawMany(),
      countQueryBuilder.select('COUNT(*) AS TOTAL').getRawOne(),
    ]);

    const total = parseInt(totalResult?.TOTAL || '0', 10);

    return {
      data: toLowerCaseKeys(results),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caixa não encontrado');
    }

    return cashRegister;
  }

  async open(params: OpenCashRegisterParams) {
    const code = generateRandomCode();

    const { id, openingAmount, operatorId, adminId } = params;

    return this.dataSource.transaction(async (manager) => {
      const cashRegisterRepository = manager.getRepository(CashRegister);

      const movementRepository = manager.getRepository(CashRegisterMovement);

      const operatorCashRegister = await cashRegisterRepository.findOne({
        where: {
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });

      if (operatorCashRegister) {
        throw new BadRequestException('Operador já possui um caixa aberto');
      }

      const cashRegister = await cashRegisterRepository.findOne({
        where: {
          id,
          deletedAt: IsNull(),
        },
      });

      if (!cashRegister) {
        throw new NotFoundException('Caixa não encontrado');
      }

      this.validateCashRegisterAvailability(cashRegister);

      cashRegister.status = CashRegisterStatus.OPEN;
      cashRegister.operatorId = operatorId;
      cashRegister.code = code.toString();
      cashRegister.createdBy = adminId;

      await cashRegisterRepository.save(cashRegister);

      const movement = movementRepository.create({
        cashRegisterId: cashRegister.id,
        operatorId,
        openingAmount,
        totalCollectedAmount: 0,
        collectedDepositAmount: 0,
        collectedPaymentAmount: 0,
        invoicedPaymentAmount: 0,
        collectedTpaAmount: 0,
        createdBy: adminId,
        status: CashRegisterStatus.OPEN,
        finalStatus: 'pendente',
        adminStatus: 'pendente',
        dateAt: new Date(),
        createdAt: new Date(),
      });

      await movementRepository.save(movement);

      return cashRegister;
    });
  }
  async verifyMyCashRegister({
    openingCode,
    operatorId,
  }: {
    openingCode: string;
    operatorId: number;
  }) {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Caixa não encontrado');
    }

    if (cashRegister.code !== openingCode) {
      throw new BadRequestException('Código de abertura inválido');
    }

    return cashRegister;
  }

  async close(cashRegisterId: number, operatorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const cashRegisterRepository = manager.getRepository(CashRegister);
      const movementRepository = manager.getRepository(CashRegisterMovement);
      const operatorCashRegister = await cashRegisterRepository.findOne({
        where: {
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });
      if (!operatorCashRegister) {
        throw new BadRequestException('Operador não possui caixa aberto');
      }
      const cashRegister = await cashRegisterRepository.findOne({
        where: {
          id: cashRegisterId,
          deletedAt: IsNull(),
        },
      });

      if (!cashRegister) {
        throw new NotFoundException('Caixa não encontrado');
      }

      const movement = await movementRepository.findOne({
        where: {
          cashRegisterId,
          operatorId,
          status: CashRegisterStatus.OPEN,
          deletedAt: IsNull(),
        },
      });
      if (!movement) {
        throw new NotFoundException(
          'Movimento de caixa em aberto não encontrado',
        );
      }
      const { totalCash, totalCard } = await this.calculateCashRegisterSummary({
        operatorId,
        cashRegisterId: cashRegister.id,
        createdAt: movement.createdAt,
      });
      const closingDate = new Date();

      movement.status = CashRegisterStatus.CLOSED;
      movement.finalStatus = 'fechado';
      movement.adminStatus = 'pendente';
      movement.closingDate = closingDate;
      movement.collectedPaymentAmount = totalCash;
      movement.collectedTpaAmount = totalCard;
      movement.totalCollectedAmount =
        Number(movement.openingAmount ?? 0) + totalCash + totalCard;

      operatorCashRegister.status = CashRegisterStatus.CLOSED;
      operatorCashRegister.operatorId = null as any;
      operatorCashRegister.code = null as any;
      await movementRepository.save(movement);
      await cashRegisterRepository.save(operatorCashRegister);
      return movement;
    });
  }

  async findOpenByOperatorId(operatorId: number) {
    return this.cashRegisterRepository.findOne({
      where: {
        operatorId,
        status: CashRegisterStatus.OPEN,
        deletedAt: IsNull(),
      },
    });
  }

  async findAvailableForOpening(search?: string) {
    const query =
      this.cashRegisterRepository.createQueryBuilder('cashRegister');

    query
      .where('cashRegister.deletedAt IS NULL')
      .andWhere('cashRegister.blocked = :blocked', {
        blocked: YesNo.NO,
      })
      .andWhere('cashRegister.status = :status', {
        status: CashRegisterStatus.CLOSED,
      });

    if (search?.trim()) {
      const normalized = `%${search.trim().toUpperCase()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(cashRegister.name) LIKE :search', {
            search: normalized,
          }).orWhere('UPPER(cashRegister.code) LIKE :search', {
            search: normalized,
          });
        }),
      );
    }

    query.orderBy('cashRegister.id', 'DESC');

    return query.getMany();
  }

  async validateOperatorOpenCashRegister(operatorId: number) {
    const cashRegister = await this.findOpenByOperatorId(operatorId);

    if (!cashRegister) {
      throw new BadRequestException('Operador não possui caixa aberto');
    }

    return cashRegister;
  }

  async listAvailableOperators(query: ListOperatorsDto) {
    const { page = 1, limit = 10, search = '' } = query;

    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [utilizadores, totalResult] = await Promise.all([
      this.dataSource.query(
        `
      SELECT uti.NOME, uti.PK_UTILIZADOR AS codigo
      FROM FK2_MCA_TB_UTILIZADOR uti
      INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
        ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
      LEFT JOIN FK2_TB_CAIXAS caixas
        ON caixas.OPERADOR_ID = uti.PK_UTILIZADOR
        AND caixas.DELETED_AT IS NULL
      WHERE grupo_uti.FK_GRUPO IN (14, 9)
      AND caixas.OPERADOR_ID IS NULL
      AND (
        LOWER(uti.NOME) LIKE LOWER(:1)
        OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
      )
      ORDER BY uti.NOME
      OFFSET :3 ROWS FETCH NEXT :4 ROWS ONLY
      `,
        [searchParam, searchParam, offset, limit],
      ),

      this.dataSource.query(
        `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_MCA_TB_UTILIZADOR uti
      INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR grupo_uti
        ON grupo_uti.FK_UTILIZADOR = uti.PK_UTILIZADOR
      LEFT JOIN FK2_TB_CAIXAS caixas
        ON caixas.OPERADOR_ID = uti.PK_UTILIZADOR
        AND caixas.DELETED_AT IS NULL
      WHERE grupo_uti.FK_GRUPO IN (14, 9)
      AND caixas.OPERADOR_ID IS NULL
      AND (
        LOWER(uti.NOME) LIKE LOWER(:1)
        OR TO_CHAR(uti.PK_UTILIZADOR) LIKE :2
      )
      `,
        [searchParam, searchParam],
      ),
    ]);

    const total = Number(totalResult[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(utilizadores),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private validateCashRegisterAvailability(cashRegister: CashRegister) {
    if (cashRegister.blocked === YesNo.YES) {
      throw new BadRequestException('Caixa bloqueado');
    }

    if (cashRegister.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('Caixa já está aberto');
    }
  }
  private async calculateCashRegisterSummary(params: {
    operatorId: number;
    cashRegisterId: number;
    createdAt: Date;
  }) {
    const result = await this.dataSource.query(
      `
    SELECT
      SUM(
        CASE
          WHEN pagamentos.FORMA_PAGAMENTO = ${PaymentMethod.CASH}
          THEN pagamentos.VALOR_DEPOSITADO
          ELSE 0
        END
      ) AS total_cash,

      SUM(
        CASE
          WHEN pagamentos.FORMA_PAGAMENTO =${PaymentMethod.CARD}
          THEN pagamentos.VALOR_DEPOSITADO
          ELSE 0
        END
      ) AS total_card
    FROM FK2_TB_PAGAMENTOS pagamentos
    WHERE pagamentos.FK_UTILIZADOR = :1
      AND pagamentos.CAIXA_ID = :2
      AND pagamentos.ESTADO = 2
      AND pagamentos.CREATED_AT >= :3
    `,
      [params.operatorId, params.cashRegisterId, params.createdAt],
    );
    console.log(result);
    return {
      totalCash: Number(result[0]?.TOTAL_CASH || 0),
      totalCard: Number(result[0]?.TOTAL_CARD || 0),
    };
  }
}

function generateRandomCode() {
  const coded = randomInt(100000, 999999);

  return coded;
}

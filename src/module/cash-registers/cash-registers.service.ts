import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, DataSource, IsNull, Repository } from 'typeorm';

import { CashRegister } from './entities/cash-register.entity';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';

import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { ListCashRegistersDto } from './dto/list-cash-registers.dto';

import { OpenCashRegisterParams } from './types';

import { CashRegisterStatus, YesNo } from './enums/cash-register-status.enum';
import { randomInt } from 'crypto';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly cashRegisterRepository: Repository<CashRegister>,

    private readonly dataSource: DataSource,
  ) {}

  /*
  |--------------------------------------------------------------------------
  | CRUD
  |--------------------------------------------------------------------------
  */

  async create(data: CreateCashRegisterDto) {
    const cashRegister = this.cashRegisterRepository.create({
      ...data,
      status: CashRegisterStatus.CLOSED,
      blocked: YesNo.NO,
    });

    return this.cashRegisterRepository.save(cashRegister);
  }

  async findAll(filters?: ListCashRegistersDto) {
    const query =
      this.cashRegisterRepository.createQueryBuilder('cashRegister');

    query.where('cashRegister.deletedAt IS NULL');

    if (filters?.search?.trim()) {
      const search = `%${filters.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(cashRegister.name) LIKE UPPER(:search)', {
            search,
          }).orWhere('UPPER(cashRegister.code) LIKE UPPER(:search)', {
            search,
          });
        }),
      );
    }

    if (filters?.status) {
      query.andWhere('cashRegister.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.blocked) {
      query.andWhere('cashRegister.blocked = :blocked', {
        blocked: filters.blocked,
      });
    }

    query.orderBy('cashRegister.id', 'DESC');

    return query.getMany();
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

  async update(id: number, data: UpdateCashRegisterDto) {
    const cashRegister = await this.findById(id);

    Object.assign(cashRegister, data);

    return this.cashRegisterRepository.save(cashRegister);
  }

  async softDelete(id: number, deletedBy?: number) {
    const cashRegister = await this.findById(id);

    cashRegister.deletedAt = new Date();
    cashRegister.deletedBy = deletedBy;

    return this.cashRegisterRepository.save(cashRegister);
  }

  /*
  |--------------------------------------------------------------------------
  | OPEN / CLOSE
  |--------------------------------------------------------------------------
  */

  async open(params: OpenCashRegisterParams) {
    const code = await generateRandomCode();

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
      const closingDate = new Date();
      movement.status = CashRegisterStatus.CLOSED;
      movement.finalStatus = 'fechado';
      movement.adminStatus = 'pendente';
      movement.closingDate = closingDate;

      operatorCashRegister.status = CashRegisterStatus.CLOSED;
      operatorCashRegister.operatorId = null as any;
      await cashRegisterRepository.save(operatorCashRegister);
      await movementRepository.save(movement);
      console.log({ operatorCashRegister, movement });

      return cashRegister;
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FINDERS
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | VALIDATIONS
  |--------------------------------------------------------------------------
  */

  async validateOperatorOpenCashRegister(operatorId: number) {
    const cashRegister = await this.findOpenByOperatorId(operatorId);

    if (!cashRegister) {
      throw new BadRequestException('Operador não possui caixa aberto');
    }

    return cashRegister;
  }

  private validateCashRegisterAvailability(cashRegister: CashRegister) {
    if (cashRegister.blocked === YesNo.YES) {
      throw new BadRequestException('Caixa bloqueado');
    }

    if (cashRegister.status === CashRegisterStatus.OPEN) {
      throw new BadRequestException('Caixa já está aberto');
    }
  }
}

async function generateRandomCode() {
  const coded = randomInt(100000, 999999);

  return coded;
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets, DataSource } from 'typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { ListCashRegistersDto } from './dto/list-cash-registers.dto';
import { CashRegisterMovement } from './entities/cash-register-movement.entity';
import { OpenCashRegisterParams } from './types';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly repository: Repository<CashRegister>,

    @InjectRepository(CashRegisterMovement)
    private readonly movementRepository: Repository<CashRegisterMovement>,

    private readonly dataSource: DataSource,
  ) {}

  async create(data: CreateCashRegisterDto) {
    const cashRegister = this.repository.create({
      ...data,
      status: 'fechado',
      blocked: 'N',
    });

    return this.repository.save(cashRegister);
  }

  async findAll(filters?: ListCashRegistersDto) {
    const query = this.repository.createQueryBuilder('cashRegister');

    query.where('cashRegister.deletedAt IS NULL');

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(cashRegister.name) LIKE UPPER(:search)', {
            search: `%${filters.search}%`,
          }).orWhere('UPPER(cashRegister.code) LIKE UPPER(:search)', {
            search: `%${filters.search}%`,
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

  async findOne(id: number) {
    const cashRegister = await this.repository.findOne({
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
    const cashRegister = await this.findOne(id);

    Object.assign(cashRegister, data);

    return this.repository.save(cashRegister);
  }

  async remove(id: number, deletedBy?: number) {
    const cashRegister = await this.findOne(id);

    cashRegister.deletedAt = new Date();
    cashRegister.deletedBy = deletedBy;

    return this.repository.save(cashRegister);
  }

  async openCashRegister(data: OpenCashRegisterParams) {
    const { id, openingAmount, operatorId } = data;

    return this.dataSource.transaction(async (manager) => {
      const cashRegisterRepository = manager.getRepository(CashRegister);

      const movementRepository = manager.getRepository(CashRegisterMovement);

      const existingCashRegister = await cashRegisterRepository.findOne({
        where: {
          operatorId,
          status: 'aberto',
          deletedAt: IsNull(),
        },
      });

      if (existingCashRegister) {
        throw new BadRequestException('Operador já tem um caixa aberto');
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

      if (cashRegister.blocked === 'S') {
        throw new BadRequestException('Caixa bloqueado');
      }

      if (cashRegister.status === 'aberto') {
        throw new BadRequestException('Caixa já está aberto');
      }

      cashRegister.status = 'aberto';
      cashRegister.operatorId = operatorId;

      await cashRegisterRepository.save(cashRegister);
      const movement = movementRepository.create({
        cashRegisterId: cashRegister.id,
        operatorId,
        openingAmount,
        totalCollectedAmount: 0,
        collectedDepositAmount: 0,
        collectedPaymentAmount: 0,
        invoicedPaymentAmount: 0,

        status: 'aberto',
        finalStatus: 'pendente',

        dateAt: new Date(),

        createdAt: new Date(),
      });

      await movementRepository.save(movement);

      return cashRegister;
    });
  }

  async avaliableCashRegistersForOpening(search?: string) {
    const query = this.repository.createQueryBuilder('cashRegister');
    query.where('cashRegister.deletedAt IS NULL');
    query.andWhere('cashRegister.blocked = :blocked', {
      blocked: 'N',
    });
    query.andWhere('cashRegister.status = :status', {
      status: 'fechado',
    });
    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('UPPER(cashRegister.name) LIKE UPPER(:search)', {
            search: `%${search.trim()}%`,
          }).orWhere('UPPER(cashRegister.code) LIKE UPPER(:search)', {
            search: `%${search.trim()}%`,
          });
        }),
      );
    }
    query.orderBy('cashRegister.id', 'DESC');
    const result = await query.getMany();
    return { data: result };
  }

  async closeCashRegister(id: number, operatorId: number) {
    const cashRegister = await this.findOne(id);

    if (cashRegister.status === 'fechado') {
      throw new BadRequestException('Caixa já está fechado');
    }

    if (cashRegister.operatorId !== operatorId) {
      throw new BadRequestException(
        'Operador não pode fechar o caixa, em uso por outro operador',
      );
    }

    await this.repository.update(id, {
      status: 'fechado',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      operatorId: null as any,
    });
  }

  async findCashRegisterOpenByOperatorId(operatorId: number) {
    const cashRegister = await this.repository.findOne({
      where: {
        operatorId: operatorId,
        status: 'aberto',
        deletedAt: IsNull(),
      },
    });

    return cashRegister;
  }
}

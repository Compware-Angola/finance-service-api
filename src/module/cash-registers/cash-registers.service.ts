import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets } from 'typeorm';
import { CashRegister } from './entities/cash-register.entity';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { ListCashRegistersDto } from './dto/list-cash-registers.dto';

@Injectable()
export class CashRegistersService {
  constructor(
    @InjectRepository(CashRegister)
    private readonly repository: Repository<CashRegister>,
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

  async openCashRegister(id: number, operatorId: number) {
    // const existingCashRegister = await this.repository.findOne({
    //   where: {
    //     operatorId,
    //     status: 'aberto',
    //     deletedAt: IsNull(),
    //   },
    // });

    // if (existingCashRegister) {
    //   throw new BadRequestException('Operador já tem um caixa aberto');
    // }

    const cashRegister = await this.findOne(id);

    if (cashRegister.blocked === 'S') {
      throw new BadRequestException('Caixa bloqueado');
    }

    if (cashRegister.status === 'aberto') {
      throw new BadRequestException('Caixa já está aberto');
    }

    cashRegister.status = 'aberto';
    cashRegister.operatorId = operatorId;

    return this.repository.save(cashRegister);
  }

  async closeCashRegister(id: number, operatorId: number) {
    const cashRegister = await this.findOne(id);

    if (cashRegister.status === 'fechado') {
      throw new BadRequestException('Caixa já está fechado');
    }

    // if (cashRegister.operatorId !== operatorId) {
    //   throw new BadRequestException(
    //     'Operador não pode fechar o caixa, em uso por outro operador',
    //   );
    // }

    await this.repository.update(id, {
      status: 'fechado',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      operatorId: null as any,
    });
  }

  async findCashRegisterOpenByOperatorId(operatorId: number) {
    const cashRegister = await this.repository.findOne({
      where: {
        operatorId,
        status: 'aberto',
        deletedAt: IsNull(),
      },
    });

    if (!cashRegister) {
      throw new NotFoundException('Operador sem caixa aberto');
    }

    return cashRegister;
  }
}

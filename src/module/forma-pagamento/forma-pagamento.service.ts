import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { FormaPagamentoEntity } from './entities/forma-pagamento.entity';

import { CreateFormaPagamentoDto } from './dto/create-forma-pagamento.dto';
import { UpdateFormaPagamentoDto } from './dto/update-forma-pagamento.dto';
import { UpdateStatusFormaPagamentoDto } from './dto/update-status-forma-pagamento.dto';
import { FilterFormaPagamentoDto } from './dto/filter-forma-pagamento.dto';

@Injectable()
export class FormaPagamentoService {
  constructor(
    @InjectRepository(FormaPagamentoEntity)
    private readonly repository: Repository<FormaPagamentoEntity>,
  ) {}

  async create(data: CreateFormaPagamentoDto) {
    const entity = this.repository.create(data);

    return await this.repository.save(entity);
  }

  async findAll(filters: FilterFormaPagamentoDto) {
    const query = this.repository.createQueryBuilder('formaPagamento');

    if (filters.status !== undefined) {
      query.andWhere('formaPagamento.status = :status', {
        status: filters.status,
      });
    }

    if (filters.codigo !== undefined) {
      query.andWhere('formaPagamento.codigo = :codigo', {
        codigo: filters.codigo,
      });
    }

    if (filters.search) {
      query.andWhere(
        `
      UPPER(formaPagamento.descricao)
      LIKE
      UPPER(:search)
      `,
        {
          search: `%${filters.search}%`,
        },
      );
    }

    query.orderBy('formaPagamento.codigo', 'ASC');

    return await query.getMany();
  }

  async findOne(codigo: number) {
    const entity = await this.repository.findOne({
      where: {
        codigo,
      },
    });

    if (!entity) {
      throw new NotFoundException('Forma de pagamento não encontrada');
    }

    return entity;
  }

  async update(codigo: number, data: UpdateFormaPagamentoDto) {
    const entity = await this.findOne(codigo);

    Object.assign(entity, data);

    return await this.repository.save(entity);
  }

  async toggleStatus(codigo: number) {
    const entity = await this.findOne(codigo);

    await this.repository.update(codigo, {
      status: entity.status === 1 ? 0 : 1,
    });

    return this.findOne(codigo);
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull, Like, FindOptionsWhere } from 'typeorm'
import { CreateTipoCreditoDto, FilterTipoCreditoDto } from './dto/create-tipo_credito.dto'
import { TipoCredito } from './entities/tipo_credito.entity'
import { DataSource } from 'typeorm'
import { toLowerCaseKeys } from '../util/toLowerCaseKeys'
import { UpdateTipoCreditoDto } from './dto/update-tipo_credito.dto'

@Injectable()
export class TipoCreditoService {
  constructor(
    @InjectRepository(TipoCredito)
    private readonly repo: Repository<TipoCredito>,

  ) { }

  async create(dto: CreateTipoCreditoDto) {
    const exists = await this.repo.findOne({ where: { sigla: dto.sigla } })
    if (exists) throw new BadRequestException(`A sigla '${dto.sigla}' já existe`)

    const novo = this.repo.create({
      ...dto,
      status: 1,
      createdAt: new Date(),
    })
    return this.repo.save(novo)
  }
  async findAll(filter: FilterTipoCreditoDto) {
    const { page = 1, limit = 10, search, status = 1, deleted = false } = filter
    const skip = (page - 1) * limit
    const where: FindOptionsWhere<TipoCredito> = {}
    if (search) {
      where.designacao = Like(`%${search}%`)
      where.sigla = Like(`%${search}%`)
    }
    if (status) {
      where.status = status
    }
    if (deleted) {
      where.deleteAt = IsNull()
    }
    const [data, total] = await this.repo.findAndCount({
      where,
      order: { codigo: 'ASC' },
      skip,
      take: limit,
    })

    return {
      data: toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }


  async findOne(id: number) {
    const tipo = await this.repo.findOne({
      where: { codigo: id, status: 1 },
    })

    if (!tipo) throw new NotFoundException('Tipo de crédito não encontrado')
    const data = toLowerCaseKeys(tipo) as TipoCredito
    return { data }
  }

  async update(id: number, dto: UpdateTipoCreditoDto) {
    const tipo = await this.findOne(id)
    if (dto.sigla && dto.sigla !== tipo.data.sigla) {
      const exists = await this.repo.findOne({ where: { sigla: dto.sigla } })
      if (exists) {
        throw new BadRequestException(
          `Já existe um tipo de crédito com a sigla '${dto.sigla}'`,
        )
      }
    }


    Object.assign(tipo.data, {
      ...dto,
      updatedAt: new Date(),
    })

    return this.repo.save(tipo.data)
  }


  async delete(id: number) {
    const tipo = await this.findOne(id)
    tipo.data.deleteAt = new Date()
    tipo.data.status = 0
    await this.repo.save(tipo.data)
    return { message: 'Tipo de crédito eliminado com sucesso' }
  }

  async restore(id: number) {
    const tipo = await this.findOne(id)
    tipo.data.deleteAt = undefined
    tipo.data.status = 1
    await this.repo.save(tipo.data)
    return { message: 'Tipo de crédito restaurado com sucesso' }
  }
  async active(id: number) {
    const tipo = await this.findOne(id)
    tipo.data.status = 1
    await this.repo.save(tipo.data)
    return { message: 'Tipo de crédito ativado com sucesso' }
  }

  async inactive(id: number) {
    const tipo = await this.findOne(id)
    tipo.data.status = 0
    await this.repo.save(tipo.data)
    return { message: 'Tipo de crédito inativado com sucesso' }
  }
}

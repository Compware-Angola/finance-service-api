// sigla-tipo-servicos.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSiglaTipoServicoDto } from './dto/create-siglas-service.dto';
import { SiglaTipoServico } from './entities/siglas-service.entity';
import { UpdateSiglaTipoServicoDto } from './dto/update-siglas-service.dto';

@Injectable()
export class SiglaTipoServicosService {
  constructor(
    @InjectRepository(SiglaTipoServico)
    private readonly repository: Repository<SiglaTipoServico>,
  ) {}

  async create(dto: CreateSiglaTipoServicoDto): Promise<SiglaTipoServico> {
    const existente = await this.repository.findOne({
      where: { sigla: dto.sigla },
    });

    if (existente) {
      throw new ConflictException(
        `Já existe uma sigla registada com o valor "${dto.sigla}".`,
      );
    }

    const entidade = this.repository.create(dto);
    return this.repository.save(entidade);
  }

  async findAll(): Promise<SiglaTipoServico[]> {
    return this.repository.find({ order: { codigo: 'ASC' } });
  }

  async findOne(codigo: number): Promise<SiglaTipoServico> {
    const registo = await this.repository.findOne({ where: { codigo } });

    if (!registo) {
      throw new NotFoundException(
        `Sigla de tipo de serviço com código ${codigo} não encontrada.`,
      );
    }

    return registo;
  }

  async update(
    codigo: number,
    dto: UpdateSiglaTipoServicoDto,
  ): Promise<SiglaTipoServico> {
    const registo = await this.findOne(codigo);

    if (dto.sigla && dto.sigla !== registo.sigla) {
      const existente = await this.repository.findOne({
        where: { sigla: dto.sigla },
      });
      if (existente) {
        throw new ConflictException(
          `Já existe uma sigla registada com o valor "${dto.sigla}".`,
        );
      }
    }

    Object.assign(registo, dto);
    return this.repository.save(registo);
  }

  async remove(codigo: number): Promise<void> {
    const registo = await this.findOne(codigo);
    await this.repository.remove(registo);
  }
}

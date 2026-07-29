import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateConciliacaoDividaDto } from './dto/create-conciliacao-divida.dto';
import { UpdateConciliacaoDividaDto } from './dto/update-conciliacao-divida.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from 'src/module/invoice/entities/invoice.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ConciliacaoDividasService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
  ) { }
  async create(createConciliacaoDividaDto: CreateConciliacaoDividaDto) {

    const { InvoiceId, descricao, itens } = createConciliacaoDividaDto

    const faturaExistente = await this.invoiceRepo.findOne({ where: { Codigo: InvoiceId } })
    if (!faturaExistente) {
      throw new BadRequestException('Fatura não encontrada')
    }

    return 'This action adds a new conciliacaoDivida';
  }

}

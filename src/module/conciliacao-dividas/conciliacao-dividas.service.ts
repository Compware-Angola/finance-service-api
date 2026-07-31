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
    const { invoices, descricao } = createConciliacaoDividaDto;

    const errors: { invoiceId: number; designacao: string; mensagem: string }[] = [];

    for (const invoice of invoices) {
      const faturaExistente = await this.invoiceRepo.findOne({
        where: { Codigo: invoice.InvoiceId },
      });

      if (!faturaExistente) {
        errors.push({
          invoiceId: invoice.InvoiceId,
          designacao: '',
          mensagem: `A fatura ${invoice.InvoiceId} não foi encontrada.`,
        });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Uma ou mais faturas não foram encontradas.',
        errors,
      });
    }

    return 'This action adds a new conciliacaoDivida';
  }
}

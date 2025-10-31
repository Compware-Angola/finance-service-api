import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';

@Injectable()
export class PaymentService {
    constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    ) {
 
    }
  create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepository.create(createPaymentDto);
    return this.paymentRepository.save(payment);
  }

  findAll(): Promise<Payment[]> {
    return this.paymentRepository.find();
  }

  findOne(id: number): Promise<Payment | null> {
    return this.paymentRepository.findOneBy({ Codigo: id });
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    await this.paymentRepository.update(id, updatePaymentDto);
    return this.findOne(id) as Promise<Payment>;
  }

  async remove(id: number): Promise<void> {
    await this.paymentRepository.delete(id);
  }

  /**
     * Lista pagamentos paginados e filtrados por Ano Lectivo e Código de Pré-Inscrição.
     *
     * @param anoLectivo O código (ID) do ano lectivo.
     * @param codigoPreInscricao O código (ID) da pré-inscrição do aluno.
     * @param paginationQuery O DTO com os parâmetros de limite e página.
     * @returns Uma Promise que resolve para um PagedResult de entidades Payment.
     */
    async findByAcademicYearAndPreRegistationCode(
        anoLectivo: number,
        codigoPreInscricao: number,
        paginationQuery: PaginationQueryDto,
    ): Promise<PagedResult<Payment>> {
        
        const { limit = 10, page = 1 } = paginationQuery;

        // 1. Calcular o OFFSET
        const skip = (page - 1) * limit;

        // 2. Executar a consulta com Filtros e Paginação
        const [payments, total] = await this.paymentRepository.findAndCount({
            where: {
                AnoLectivo: anoLectivo,
                Codigo_PreInscricao: codigoPreInscricao,
            },
            
            // TypeORM Paginação
            take: limit, // LIMIT
            skip: skip,  // OFFSET
            
            // Ordenação (Boa Prática)
            order: { Codigo: 'DESC' }, 
            
            // Opcional: Adicione relações se precisar de dados relacionados
            // relations: ['algumaRelacao'],
        });

    
        const totalPages = Math.ceil(total / limit);

        return {
            data: payments,
            total,
            page,
            limit,
            totalPages,
        };
    }
}

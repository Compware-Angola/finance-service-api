import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { Payment } from './entities/payment.entity';
import { DetailedPaymentInvoiceItemResult } from './dto/payment-invoice-item-result.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
@Injectable()
export class PaymentService {
    private anoAtualPrincipal: number;
    constructor(
        private readonly anoLectivoUtil: AnoLectivoUtil,
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        private readonly invoiceService: InvoiceService,
        private dataSource: DataSource,
    ) { this.initAnoAtual(); }
    private async initAnoAtual() {
        this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
    }

    /**
     * Busca Pagamentos, Faturas e seus Itens em formato "flat" (plano) com paginação,
     * incluindo a descrição do serviço, "filtrando" pelo Ano Lectivo e Código de Pré-Inscrição.
     *
     * @param anoLectivo O ID do ano lectivo.
     * @param codigoPreInscricao O código da pré-inscrição.
     * @param paginationQuery O DTO de paginação (limit e page).
     * @returns Uma Promise que resolve para um PagedResult contendo os resultados planos.
     */
async findInvoicesAndItemsDetailedFlat(
  anoLectivo: string,
  codigoPreInscricao: string,
  paginationQuery: PaginationQueryDto,
): Promise<PagedResult<any>> {
  const { limit = 10, page = 1 } = paginationQuery;
  const skip = (page - 1) * limit;

  const baseQuery = this.paymentRepository
    .createQueryBuilder('p')
    .innerJoin('UMA_FACTURA', 'f', '"p"."codigo_factura" = "f"."Codigo"')
    .innerJoin('UMA_FACTURA_ITEMS', 'fi', '"f"."Codigo" = "fi"."CodigoFactura"')
    .innerJoin('UMA_TB_TIPO_SERVICOS', 'tp', '"fi"."CodigoProduto" = "tp"."Codigo"')
    .where('REGEXP_LIKE(TRIM("p"."AnoLectivo"), \'^[0-9]+$\')')
    .andWhere('REGEXP_LIKE(TRIM("p"."Codigo_PreInscricao"), \'^[0-9]+$\')')
    .andWhere('TRIM("p"."AnoLectivo") = :anoLectivo', { anoLectivo })
    .andWhere('TRIM("p"."Codigo_PreInscricao") = :codigoPreInscricao', { codigoPreInscricao })
    .andWhere('"p"."status_pagamento" = :status', { status: 'concluido' });

  // CONTAGEM
  const totalResult = await baseQuery
    .select('COUNT(DISTINCT("p"."Codigo"))', 'cnt')
    .getRawOne();

  const total = Number(totalResult?.cnt || 0);
  const totalPages = Math.ceil(total / limit);

  if (total === 0) {
    return { data: [], total, page, limit, totalPages };
  }

  const results = await baseQuery
    .select([
      // PAGAMENTO
      '"p"."Codigo" AS "CodigoPagamento"',
      '"p"."Data" AS "DataPagamento"',
      '"p"."N_Operacao_Bancaria" AS "p_N_Operacao_Bancaria"',
      '"p"."valor_depositado" AS "p_valor_depositado"',
      '"p"."status_pagamento" AS "p_status_pagamento"',
      '"p"."created_at" AS "DataRegistoPagamento"',
      '"p"."statusMovimento" AS "p_statusMovimento"',
      '"p"."ContaMovimentada" AS "p_ContaMovimentada"',
      '"p"."forma_pagamento" AS "p_forma_pagamento"',

      // FATURA
      '"f"."Codigo" AS "CodigoFactura"',
      '"f"."Descricao" AS "Descricao_factura"',
      '"f"."DataFactura" AS "f_DataFactura"',
      '"f"."Referencia" AS "f_Referencia"',
      '"f"."estado" AS "EstadoFactura"',
      '"f"."ValorAPagar" AS "f_ValorAPagar"',
      '"f"."TotalPreco" AS "TotalBrutoFactura"',
      '"f"."TotalMulta" AS "TotalMultaFactura"',

      // ITEM
      '"fi"."codigo" AS "CodigoItem"',
      '"fi"."CodigoProduto" AS "CodigoProduto"',
      '"fi"."OBS" AS "ObservacaoItem"',
      '"fi"."Quantidade" AS "Quantidade"',
      '"fi"."preco" AS "PrecoUnitario"',
      '"fi"."Total" AS "TotalItem"',
      '"fi"."Mes" AS "MesReferencia"',
      '"fi"."Multa" AS "MultaItem"',
      '"fi"."valor_pago" AS "valor_pago"',
      '"fi"."taxa_iva" AS "taxa_iva"',

      // PRODUTO
      '"tp"."Descricao" AS "Descricao_produto"',
    ])
    .offset(skip)
    .limit(limit)
    .orderBy('"p"."DataRegisto"', 'DESC')
    .addOrderBy('"f"."DataFactura"', 'DESC')
    .addOrderBy('"fi"."codigo"', 'ASC')
    .getRawMany();

  return {
    data: results,
    total,
    page,
    limit,
    totalPages,
  };
}
    async createPayment(dto: CreatePaymentDto) {
        const anoCorrente = this.anoAtualPrincipal;
        const { status_pagamento, N_Operacao_Bancaria, N_Operacao_Bancaria2, AnoLectivo, ...rest } = dto;
        const paymentStatus: 'concluido' = 'concluido';
        if (!N_Operacao_Bancaria) return new BadRequestException("Precisa de uma operacao bancaria")
        const n_op = await this.findPaymentByN_Operacao_Bancaria(N_Operacao_Bancaria);
        if (n_op) return new BadRequestException(`Este Numero de Operacao Bancaria ja existe ${N_Operacao_Bancaria}`)
        if (N_Operacao_Bancaria2) {
            const n_op2 = await this.findPaymentByN_Operacao_Bancaria2(N_Operacao_Bancaria2);
            if (n_op2) return new BadRequestException(`Este numero de Operacao Bancaria ja existe 2 ${N_Operacao_Bancaria2}`)
        }
        if (!dto.codigo_factura) return new BadRequestException("Precisa de uma fatura para criar um pagamento")
        const invoice = await this.invoiceService.findOne(dto.codigo_factura);
        const itens = await this.dataSource.query(`
        SELECT
            tp.Codigo AS CodigoProduto,
            tp.Descricao As DescricaoProduto,
            tp.Preco AS PrecoProduto,
            tp.TipoServico AS TipoServicoProduto,
            fi.*
        FROM "."UMA_TB_TIPO_SERVICOS" tp
        INNER JOIN factura_items fi ON fi.CodigoProduto = tp.Codigo
        WHERE "fi".CodigoFactura = ?`, [invoice.Codigo]);
        const specific_services = [
            "Taxa de Reingresso",
            "Candidatura de Transferência para UMA",
            "Candidatura ao 1º Ano",
            "Taxa de Exame de Admissão"
        ];;
        const search = await itens.some((item: any) =>
            specific_services.includes(item.DescricaoProduto)
        );
        if (search) {
            itens.forEach((item: any) => {
                const serviceDescription = item.DescricaoProduto;

                switch (serviceDescription) {
                    case "Taxa de Reingresso":
                        console.log(`Ação para o Serviço Específico: ${serviceDescription}`);
                        // Lógica específica para a Taxa de Reingresso
                        break;

                    case "Candidatura de Transferência para UMA":
                        console.log(`Ação para o Serviço Específico: ${serviceDescription}`);
                        // Lógica específica para Candidatura de Transferência
                        break;

                    case "Candidatura ao 1º Ano":
                    case "Taxa de Exame de Admissão":
                        console.log(`Ação para o Serviço Específico: ${serviceDescription} (Casos agrupados)`);
                        // Lógica comum para as duas candidaturas/taxas
                        break;

                    default:
                        // Ignora descrições que não são as específicas ou que não estão no switch
                        break;
                }
            });

        }

        const finalPayload = {
            ...rest,

            AnoLectivo: anoCorrente,
            codigo_factura: dto.codigo_factura,
            instituicao_id: undefined,
            N_Operacao_Bancaria,
            N_Operacao_Bancaria2,
            status_pagamento: paymentStatus,
            estado: 1,
        };
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            invoice.estado = 1;
            await this.invoiceService.updateEntity(invoice)
            const payment = this.paymentRepository.create(finalPayload);
            await this.paymentRepository.save(payment);
            return payment;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();

        }

    }
    async findPaymentByN_Operacao_Bancaria(N_Operacao_Bancaria: string): Promise<Payment | null> {
        return this.paymentRepository.findOne({ where: { N_Operacao_Bancaria } });
    }
    async findPaymentByN_Operacao_Bancaria2(N_Operacao_Bancaria2: string): Promise<Payment | null> {
        return this.paymentRepository.findOne({ where: { N_Operacao_Bancaria2 } });
    }
}
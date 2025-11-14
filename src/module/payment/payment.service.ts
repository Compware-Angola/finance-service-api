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
     * incluindo a descrição do serviço, filtrando pelo Ano Lectivo e Código de Pré-Inscrição.
     *
     * @param anoLectivo O ID do ano lectivo.
     * @param codigoPreInscricao O código da pré-inscrição.
     * @param paginationQuery O DTO de paginação (limit e page).
     * @returns Uma Promise que resolve para um PagedResult contendo os resultados planos.
     */
    async findInvoicesAndItemsDetailedFlat(
        anoLectivo: number,
        codigoPreInscricao: number,
        paginationQuery: PaginationQueryDto,
    ): Promise<PagedResult<any>> { // Usando 'any' ou a interface DetailedPaymentInvoiceItemResult

        const { limit = 10, page = 1 } = paginationQuery;
        const skip = (page - 1) * limit;

        const aliasPayment = 'p';
        const aliasFactura = 'f';
        const aliasItem = 'fi';
        const aliasProduto = 'tp';

        // 1. Criar o QueryBuilder base
        const baseQuery = this.paymentRepository.createQueryBuilder(aliasPayment)
            .innerJoin('factura', aliasFactura, `${aliasPayment}.codigo_factura = ${aliasFactura}.Codigo`)
            .innerJoin('factura_items', aliasItem, `${aliasFactura}.Codigo = ${aliasItem}.CodigoFactura`)
            .innerJoin('tb_tipo_servicos', aliasProduto, `${aliasItem}.CodigoProduto = ${aliasProduto}.Codigo`)
            .where(`${aliasPayment}.AnoLectivo = :anoLectivo`, { anoLectivo })
            .andWhere(`${aliasPayment}.Codigo_PreInscricao = :codigoPreInscricao`, { codigoPreInscricao })
            .andWhere(`${aliasPayment}.status_pagamento = :status`, { status: 'concluido' });


        // --- 2. Obter a contagem total de linhas ---
        // Usamos o QueryBuilder base para contar todas as linhas que satisfazem os JOINs e WHEREs.
        const total = await baseQuery.getCount();

        // --- 3. Obter os resultados paginados e formatados ---
        const results = await baseQuery
            .select([
                // DADOS DO PAGAMENTO (tb_pagamentos)
                `${aliasPayment}.Codigo AS CodigoPagamento`,
                `${aliasPayment}.Data AS DataPagamento`,
                `${aliasPayment}.N_Operacao_Bancaria`,
                `${aliasPayment}.valor_depositado`,
                `${aliasPayment}.status_pagamento`,
                `${aliasPayment}.created_at AS DataRegistoPagamento`,
                `${aliasPayment}.statusMovimento`,
                `${aliasPayment}.ContaMovimentada`,
                `${aliasPayment}.forma_pagamento`,

                // DADOS DA FATURA (factura)
                `${aliasFactura}.Codigo AS CodigoFactura`,
                `${aliasFactura}.Descricao AS Descricao_factura`,
                `${aliasFactura}.DataFactura`,
                `${aliasFactura}.Referencia`,
                `${aliasFactura}.estado AS EstadoFactura`,
                `${aliasFactura}.ValorAPagar`,
                `${aliasFactura}.TotalPreco AS TotalBrutoFactura`,
                `${aliasFactura}.TotalMulta AS TotalMultaFactura`,

                // DADOS DOS ITENS (factura_items)
                `${aliasItem}.codigo AS CodigoItem`,
                `${aliasItem}.CodigoProduto`,
                `${aliasItem}.OBS AS ObservacaoItem`,
                `${aliasItem}.Quantidade`,
                `${aliasItem}.preco AS PrecoUnitario`,
                `${aliasItem}.Total AS TotalItem`,
                `${aliasItem}.Mes AS MesReferencia`,
                `${aliasItem}.Multa AS MultaItem`,
                `${aliasItem}.valor_pago`,
                `${aliasItem}.taxa_iva`,

                // DADOS DO PRODUTO (tb_tipo_servicos)
                `${aliasProduto}.Descricao AS Descricao_produto`,
            ])
            .offset(skip)
            .limit(limit)
            .orderBy(`${aliasPayment}.DataRegisto`, 'DESC')
            .addOrderBy(`${aliasFactura}.DataFactura`, 'DESC')
            .addOrderBy(`${aliasItem}.codigo`, 'ASC')
            // O método correto para resultados 'raw' com seleção customizada
            .getRawMany<DetailedPaymentInvoiceItemResult>();

        // 4. Calcular e retornar a paginação
        const totalPages = Math.ceil(total / limit);

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
        FROM tb_tipo_servicos tp
        INNER JOIN factura_items fi ON fi.CodigoProduto = tp.Codigo
        WHERE fi.CodigoFactura = ?`, [invoice.Codigo]);
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
            codigo_factura: invoice.Codigo,
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
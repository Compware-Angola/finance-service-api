import { Injectable } from '@nestjs/common';
// ... outros imports ...
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PagedResult } from 'src/common/dto/pagination-result.dto';
import { Payment } from './entities/payment.entity';

// Importe a interface detalhada
import { DetailedPaymentInvoiceItemResult } from './dto/payment-invoice-item-result.interface'; 
@Injectable()
export class PaymentService {
 constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
    ) {
        // ...
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
        const aliasProduto = 'tp'; // Alias para tb_tipo_servicos

        // 1. Criar o QueryBuilder base
        const baseQuery = this.paymentRepository.createQueryBuilder(aliasPayment)
            .innerJoin('factura', aliasFactura, `${aliasPayment}.codigo_factura = ${aliasFactura}.Codigo`)
            .innerJoin('factura_items', aliasItem, `${aliasFactura}.Codigo = ${aliasItem}.CodigoFactura`)
            .innerJoin('tb_tipo_servicos', aliasProduto, `${aliasItem}.CodigoProduto = ${aliasProduto}.Codigo`)
            .where(`${aliasPayment}.AnoLectivo = :anoLectivo`, { anoLectivo })
            .andWhere(`${aliasPayment}.Codigo_PreInscricao = :codigoPreInscricao`, { codigoPreInscricao });
            

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
}
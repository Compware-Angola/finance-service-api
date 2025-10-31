// src/module/payment/dto/payment-invoice-item-result.interface.ts (Exemplo)

export interface DetailedPaymentInvoiceItemResult {
    // DADOS DO PAGAMENTO (tb_pagamentos)
    CodigoPagamento: number;
    DataPagamento: string | Date; // Ajuste para o tipo correto da coluna 'Data'
    N_Operacao_Bancaria: string | null;
    valor_depositado: number;
    status_pagamento: string;
    DataRegistoPagamento: Date;
    statusMovimento: number;
    ContaMovimentada: number | null;
    forma_pagamento: string | null;

    // DADOS DA FATURA (factura)
    CodigoFactura: number;
    Descricao_factura: string | null;
    DataFactura: Date;
    Referencia: string | null;
    EstadoFactura: number;
    ValorAPagar: number | null;
    TotalBrutoFactura: number;
    TotalMultaFactura: number;

    // DADOS DOS ITENS (factura_items)
    CodigoItem: number;
    CodigoProduto: number;
    ObservacaoItem: string | null;
    Quantidade: number | null;
    PrecoUnitario: number;
    TotalItem: number | null;
    MesReferencia: string | null;
    MultaItem: number;
    valor_pago: number | null;
    taxa_iva: number;

    // DADOS DO PRODUTO (tb_tipo_servicos)
    Descricao_produto: string | null;
}
export interface DebtNegotiationItem {
  mes_temp_id: number;

  mes: string;

  data_inicial: Date | string;

  data_final: Date | string;

  data_limite: Date | string;

  semestre: number;

  data_final_desconto: Date | string | null;

  id_item: number;

  id_tipo_servico: number;

  descricao_servico: string;

  tipo_servico: string;

  mensalidade: number;

  desconto: number;

  multa: number;

  total_item: number;

  valor_pago: number;

  total: number;

  total_preco: number;

  codigo_matricula: number;

  ano_lectivo_fatura: number;

  ano_lectivo_fatura_designacao: string;

  reference: string;

  valorapagar: number;

  valorentregue: number;

  data_vencimento: Date | string;

  codigo_factura: number;

  total_preco_fatura: number;

  estado_fatura: string;

  data_operacao: Date | string | null;

  data_pagamento: Date | string | null;

  status_pagamento: number;
}
export type GetAllDebtNegotiationsResponse = {
  Mensalidades: DebtNegotiationItem[];
  OutrosServicos: DebtNegotiationItem[];
  anoAtual: number;
  designacao: string;
  totalIVA: number;
  percentagem_retencao: number;
  totalDivida: number;
  total_incidencia: number;
  total_retencao: number;
  size: number;
  desconto: number;
  precoTotal: number;
};

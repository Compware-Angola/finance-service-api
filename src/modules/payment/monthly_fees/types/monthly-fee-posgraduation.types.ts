export interface PostgraduateMesTempResponse {
  id: number;
  designacao: string;
  prestacao: number;
  ano_lectivo: number;
  semestre_posgraduacao: number;
  data_inicial: Date;
  data_final: Date;
  data_limite: Date;
  codigo_item_fatura?: number;
}

export interface PostgraduateBolseiroResult {
  bolseiro: boolean;
  desconto: number;
  instituicaoPagou: boolean;
  codigoBolseiro: number | null;
}

export interface PostgraduateDescontoResult {
  temDesconto: boolean;
  desconto: number;
}

export interface ObterBolseiroPosGraduacaoParams {
  anoLectivo: number;
  codigoMatricula: number;
  semestre: number;
  mensalidade: number;
}

export interface CalcularDescontoPosGraduacaoParams {
  anoLectivo: number;
  codigoMatricula: number;
  mensalidade: number;
  mesTemp: PostgraduateMesTempResponse;
}

export interface CalcularValorMensalidadePosGraduacaoParams {
  anoLectivo: number;
  codigoMatricula: number;
  mesTemp: PostgraduateMesTempResponse;
  dadosAluno: any;
}

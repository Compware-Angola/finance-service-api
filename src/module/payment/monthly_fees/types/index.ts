interface ObterBolseiroResponse { }
interface ObterBolseiroParams {
  codigoMatricula: number;
  anoLectivo: number;
  semestre: number;
}
interface CalcularValorMensalidadeParams {
  codigoMatricula: number;
  anoLectivo: number;
  mesTemp: MesTempResponse;
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[];
}

interface CalcularDescontoParams {
  codigoMatricula: number;
  anoLectivo: number;
  mesTemp: MesTempResponse;
}

interface BolsaParams {
  codigoMatricula: number;
  anoLectivo: number;
  mesTemp: MesTempResponse;
}
export interface MesTempResponse {
  data_limite: Date;
  data_final: Date;
  data_inicial: Date;
  semestre: number;
  id: number;
  designacao: string;
  prestacao: number;
}
export interface BolseiroResult {
  bolseiro: boolean;
  desconto: number;
  isentar_multa: boolean;
}
interface EstudanteInfo {
  curso: number;
  sigla: string;
  turno: number;
  polo: number;
  codigo_curso: number;
}

export {
  ObterBolseiroParams,
  CalcularValorMensalidadeParams,
  CalcularDescontoParams,
  BolsaParams,
  EstudanteInfo,
};

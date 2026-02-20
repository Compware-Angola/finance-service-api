interface ObterBolseiroResponse {}
interface ObterBolseiroParams {
  codigoMatricula: number;
  anoLectivo: number;
  semestre: number;
}
interface CalcularValorMensalidadeParams {
  codigoMatricula: number;
  anoLectivo: number;
  mesTemp: MesTempResponse;
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

export {
  ObterBolseiroParams,
  CalcularValorMensalidadeParams,
  CalcularDescontoParams,
  BolsaParams,
};

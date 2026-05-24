/**
 * Verifica se uma data cai em algum período isento.
 */
const isDiaIsento = (
  data: Date,
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[]
): boolean => {
  return periodosIsentos.some((periodo) => {
    const inicio = new Date(periodo.DATA_INICIO);
    const fim = new Date(periodo.DATA_FIM);
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);

    // Garante que inicio <= fim independente da ordem enviada
    const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio];

    return data >= de && data <= ate;
  });
};

/**
 * Verifica se uma data é domingo.
 */
const isDomingo = (data: Date): boolean => data.getDay() === 0;

/**
 * Retorna a multa aplicável com base na data de hoje e na data limite.
 *
 * Regras:
 * - Hoje < dataLimite → sem multa (0%)
 * - Hoje === dataLimite E (domingo OU dia isento) → sem multa (0%), prazo prorrogado
 * - Hoje > dataLimite → multa fixa de 10%
 * - Hoje === dataLimite (dia normal) → sem multa (0%), ainda dentro do prazo
 */
const obterMulta = (
  dataLimite: Date,
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[] = []
): number => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limite = new Date(dataLimite);
  limite.setHours(0, 0, 0, 0);

  // Dentro do prazo (inclui hoje === dataLimite)
  if (hoje <= limite) {
    return 0;
  }

  // Hoje > dataLimite: verifica se o vencimento caiu em domingo ou dia isento.
  // Nesse caso, o prazo é considerado prorrogado e não há multa enquanto
  // o pagamento ocorre no primeiro dia útil seguinte.
  // Se quiser aplicar essa tolerância apenas NO DIA SEGUINTE ao vencimento,
  // troque `isDomingo(limite)` por `isDomingo(hoje)` e similar para isento.
  const vencimentoEraIsento =
    isDomingo(limite) || isDiaIsento(limite, periodosIsentos);

  if (vencimentoEraIsento) {
    // Prorrogação: sem multa no primeiro dia útil após o vencimento isento.
    // Para uma tolerância de exatamente 1 dia, adicione:
    // const umDiaDepois = new Date(limite);
    // umDiaDepois.setDate(umDiaDepois.getDate() + 1);
    // if (hoje <= umDiaDepois) return 0;
    return 0;
  }

  // Fora do prazo → multa de 10%
  return 0.1;
};
const obterMultaPorData = (
  dataVerificacao: Date,
  dataLimite: Date,
  dataFinal: Date
): number => {
  dataVerificacao = new Date(dataVerificacao);
  dataLimite = new Date(dataLimite);
  dataFinal = new Date(dataFinal);

  dataVerificacao.setHours(0, 0, 0, 0);
  dataLimite.setHours(0, 0, 0, 0);
  dataFinal.setHours(0, 0, 0, 0);

  const adicionarUmMesSeguro = (data: Date): Date => {
    const novaData = new Date(data);
    const diaOriginal = novaData.getDate();
    novaData.setMonth(novaData.getMonth() + 1);

    if (novaData.getDate() < diaOriginal) {
      novaData.setDate(0);
    }

    return novaData;
  };

  const dataFinalMaisUmMes = adicionarUmMesSeguro(dataFinal);

  if (dataVerificacao <= dataLimite) return 0;
  if (dataVerificacao <= dataFinal) return 0.05;       // 5%
  if (dataVerificacao <= dataFinalMaisUmMes) return 0.07; // 7%

  return 0.1; // 10%
};


export { obterMulta, obterMultaPorData };
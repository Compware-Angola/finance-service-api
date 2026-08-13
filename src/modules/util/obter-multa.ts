/**
 * Verifica se uma data cai em algum período isento.
 */
const isDiaIsento = (
  data: Date,
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[]
): boolean => {
  return periodosIsentos.some((periodo) => {
    const inicio = new Date(Date.UTC(
      new Date(periodo.DATA_INICIO).getUTCFullYear(),
      new Date(periodo.DATA_INICIO).getUTCMonth(),
      new Date(periodo.DATA_INICIO).getUTCDate()
    ));
    const fim = new Date(Date.UTC(
      new Date(periodo.DATA_FIM).getUTCFullYear(),
      new Date(periodo.DATA_FIM).getUTCMonth(),
      new Date(periodo.DATA_FIM).getUTCDate()
    ));

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
 * - Hoje <= dataLimite            → 0%  (dentro do prazo)
 * - Limite era domingo ou isento  → 0%  (prazo prorrogado)
 * - Hoje > dataLimite (dia normal)→ 10%
 */
const obterMulta = (
  dataLimite: Date,
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[] = []
): number => {
  const toUTCMidnight = (data: Date): Date => {
    const d = new Date(data);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  const hoje = toUTCMidnight(new Date());
  const limite = toUTCMidnight(dataLimite);

  // Dentro do prazo normal
  if (hoje <= limite) return 0;

  // ✅ Começa a verificar a partir do dia SEGUINTE ao limite
  const limiteEfectivo = new Date(limite);
  limiteEfectivo.setUTCDate(limiteEfectivo.getUTCDate() + 1);

  // Avança enquanto encontrar domingos ou feriados consecutivos
  while (
    isDomingo(limiteEfectivo) ||
    isDiaIsento(limiteEfectivo, periodosIsentos)
  ) {
    limiteEfectivo.setUTCDate(limiteEfectivo.getUTCDate() + 1);
  }

  // hoje ainda está dentro da prorrogação → sem multa
  if (hoje <= limiteEfectivo) return 0;

  return 0.1;
};
/**
 * Retorna a multa com base numa data de verificação específica.
 *
 * Regras:
 * - dataVerificacao <= dataLimite              → 0%
 * - dataVerificacao <= dataFinal               → 5%
 * - dataVerificacao <= dataFinal + 1 mês       → 7%
 * - dataVerificacao >  dataFinal + 1 mês       → 10%
 */
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

    // Corrige overflow de mês (ex: 31 Jan → 28/29 Fev)
    if (novaData.getDate() < diaOriginal) {
      novaData.setDate(0);
    }

    return novaData;
  };

  const dataFinalMaisUmMes = adicionarUmMesSeguro(dataFinal);

  if (dataVerificacao <= dataLimite) return 0;
  if (dataVerificacao <= dataFinal) return 0.05; // 5%
  if (dataVerificacao <= dataFinalMaisUmMes) return 0.07; // 7%

  return 0.1; // 10%
};

export { obterMulta, obterMultaPorData };
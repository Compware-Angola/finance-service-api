const obterMulta = (
  dataLimite: Date,
  periodosIsentos: { DATA_INICIO: Date; DATA_FIM: Date }[] = []
) => {

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataLimiteLimpa = new Date(dataLimite);
  dataLimiteLimpa.setHours(0, 0, 0, 0);

  console.log("📅 Hoje:", hoje.toISOString().split('T')[0]);
  console.log("📅 Data Limite:", dataLimiteLimpa.toISOString().split('T')[0]);
  console.log("Hoje > DataLimite?", hoje > dataLimiteLimpa);

  const isDomingo = hoje.getDay() === 0;
  console.log("É Domingo?", isDomingo);

  const isDiaIsento = periodosIsentos.some(periodo => {
    let inicio = new Date(periodo.DATA_INICIO);
    let fim = new Date(periodo.DATA_FIM);
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);

    if (inicio > fim) [inicio, fim] = [fim, inicio];

    const dentroDoPeriodo = hoje >= inicio && hoje <= fim;
    if (dentroDoPeriodo) {
      console.log(`✅ Hoje está isento entre ${inicio.toISOString().split('T')[0]} e ${fim.toISOString().split('T')[0]}`);
    }
    return dentroDoPeriodo;
  });

  console.log("Está em período isento?", isDiaIsento);

  if (isDomingo || isDiaIsento) {
    console.log("✅ MULTA ZERADA (domingo ou isento)");
    return 0;
  }

  if (hoje > dataLimiteLimpa) {
    console.log("⚠️ MULTA DE 10% APLICADA");
    return 0.1;
  }

  console.log("✅ Dentro do prazo - Sem multa");
  return 0;
};
const obterMultaPorData = (
  dataVerificacao: Date,
  dataLimite: Date,
  dataFinal: Date,
) => {
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

  if (dataVerificacao <= dataLimite) {
    return 0;
  }

  if (dataVerificacao > dataLimite && dataVerificacao <= dataFinal) {
    return 0.05; // 5%
  }

  if (dataVerificacao > dataFinal && dataVerificacao <= dataFinalMaisUmMes) {
    return 0.07; // 7%
  }

  return 0.1; // 10%
};

export { obterMulta, obterMultaPorData };

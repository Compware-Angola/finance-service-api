const obterMulta = (dataLimite: Date, dataFinal: Date) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
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
  if (hoje <= dataLimite) {
    return 0;
  }

  if (hoje > dataLimite && hoje <= dataFinal) {
    return 0.05; // 5%
  }

  if (hoje > dataFinal && hoje <= dataFinalMaisUmMes) {
    return 0.07; // 7%
  }

  return 0.1; // 10%
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

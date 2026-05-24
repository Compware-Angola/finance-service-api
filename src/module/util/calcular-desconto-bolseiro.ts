const resolverDescontobolseiro = (
  row: any,
  mensalidade: number,
): number | null => {
  //DE ALGUMA FORMA SE TODOS FOREM NULAS ELE NÃO DEVE PERMITIR CALCULAR
  if (row?.DESCONTO == null && row?.VALOR_DESCONTO == null) {
    return null;
  }

  if (row?.CODIGO_BOLSA == null) {
    if (row?.DESCONTO == null) return null;
    return Math.min(Number(row.DESCONTO ?? row.desconto), 100);
  }

  if (row?.VALOR_DESCONTO == null) return null;
  if (row?.SIGLA === 'DESC_FIX') {
    const valorBolsaMensal = row.VALOR_DESCONTO / 10;
    const percentual = (valorBolsaMensal / mensalidade) * 100;
    return Math.min(Math.trunc(percentual), 100);
  }

  return Math.min(Number(row.VALOR_DESCONTO), 100);
};

export { resolverDescontobolseiro };

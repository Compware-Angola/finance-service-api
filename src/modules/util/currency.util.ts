// utils/currency.util.ts
export const toNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  return parseFloat(String(value).replace(/,/g, '').trim()) || 0;
};

export const sumValues = (items: any[], field: string): number => {
  return items.reduce((s, d) => s + toNumber(d[field]), 0);
};
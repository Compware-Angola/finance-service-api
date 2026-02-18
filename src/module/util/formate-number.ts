/**
 * Converte valor para número, retornando 0 (ou outro fallback) se for inválido
 * @param value - valor a converter (string, number, null, undefined, etc.)
 * @param fallback - valor padrão se a conversão falhar (default: 0)
 */
export function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  
  const num = Number(value);
  
  // Number('') → 0, Number('abc') → NaN, Number('123') → 123
  return isNaN(num) ? fallback : num;
}
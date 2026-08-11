export function roundToInt(value: number): number {
  return Math.round(value);
}

export function fixToInt(value: number): number {
  return Number(value.toFixed(2));
}

export function normalizarTextoPesquisa(texto: string | undefined): string {
  if (!texto) return '';
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

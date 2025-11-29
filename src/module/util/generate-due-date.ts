/**
 * Gera uma data de vencimento adicionando X dias a partir de uma data base.
 * 
 * @param days Número de dias até o vencimento (ex: 10 → vence em 10 dias)
 * @param fromDate (opcional) Data base, "padr"ão é a data atual
 * @returns string - data no formato 'YYYY-MM-DD'
 */
export async function generateDueDate(days: number, fromDate: Date = new Date()): Promise<string> {
  const dueDate = new Date(fromDate);
  dueDate.setDate(fromDate.getDate() + days);
  
  // Formatar como 'YYYY-MM-DD'
  const year = dueDate.getFullYear();
  const month = String(dueDate.getMonth() + 1).padStart(2, '0');
  const day = String(dueDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
/*

// Vence daqui a 10 dias
const vencimento10 = generateDueDate(10);
console.log(vencimento10); // Exemplo: '2025-11-03'

// Vence daqui a 30 dias a partir de uma data específica
const vencimento30 = generateDueDate(30, "new" Date('2025-10-01'));
console.log(vencimento30); // '2025-10-31'

*/
/**
 * CsvExportHelper
 * Utilitário genérico para exportar dados em formato CSV com suporte a streaming.
 */
export class CsvExportHelper {
    /**
     * Formata um valor individual para uma célula CSV segura.
     * - Converte null/undefined para string vazia
     * - Escapa aspas duplas duplicando-as
     * - Envolve em aspas se o valor contiver ponto e vírgula, aspas ou nova linha
     */
    static formatCell(value: unknown): string {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    /**
     * Gera um CSV de forma assíncrona via AsyncGenerator.
     *
     * @param headers   Array com os cabeçalhos das colunas
     * @param rows      AsyncGenerator que produz lotes de linhas
     * @param mapper    Função que mapeia cada linha para um array de valores na
     *                  mesma ordem dos headers
     * @param separator Separador de colunas (padrão: ';')
     *
     * @example
     * async function* exportCsv() {
     *   yield* CsvExportHelper.generate(
     *     ['Nome', 'Email'],
     *     this.iterateRows(filters),
     *     (row) => [row.name, row.email],
     *   );
     * }
     */
    static async *generate<T>(
        headers: string[],
        rows: AsyncGenerator<T[]>,
        mapper: (row: T) => unknown[],
        separator = ';',
    ): AsyncGenerator<string> {
        // BOM UTF-8 para compatibilidade com Excel
        yield '\uFEFF';
        yield headers.map((h) => CsvExportHelper.formatCell(h)).join(separator) + '\n';

        for await (const batch of rows) {
            yield batch
                .map((row) =>
                    mapper(row)
                        .map((v) => CsvExportHelper.formatCell(v))
                        .join(separator),
                )
                .join('\n') + '\n';
        }
    }
}
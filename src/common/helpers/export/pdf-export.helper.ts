import PDFKit from 'pdfkit';

export interface PdfColumn<T> {
    /** Texto exibido no cabeçalho */
    label: string;
    /** Chave do objeto de linha */
    key: keyof T;
    /** Largura da coluna em pontos */
    width: number;
}

export interface PdfTableOptions<T> {
    /** Título exibido no topo de cada página */
    title: string;
    /** Definição das colunas */
    columns: PdfColumn<T>[];
    /** Altura de cada linha em pontos (padrão: 15) */
    rowHeight?: number;
    /** Tamanho da fonte do cabeçalho (padrão: 6) */
    headerFontSize?: number;
    /** Tamanho da fonte das linhas (padrão: 5.5) */
    rowFontSize?: number;
    /** Cor de fundo do cabeçalho em hex (padrão: '#0D1B48') */
    headerBgColor?: string;
    /** Cor do texto do cabeçalho (padrão: '#FFFFFF') */
    headerTextColor?: string;
    /** Cor da borda das células (padrão: '#D1D5DB') */
    cellBorderColor?: string;
}

/**
 * PdfExportHelper
 * Utilitário genérico para gerar tabelas paginadas em documentos PDFKit.
 */
export class PdfExportHelper {
    /**
     * Escreve uma tabela paginada no documento PDF fornecido.
     *
     * @param document  Instância do PDFDocument (pdfkit)
     * @param rows      AsyncGenerator que produz lotes de linhas
     * @param options   Configuração das colunas, título e estilos
     *
     * @example
     * await PdfExportHelper.writeTable(
     *   document,
     *   this.iterateRows(filters),
     *   {
     *     title: 'Mensalidades pagas',
     *     columns: [
     *       { label: 'Nome', key: 'nomeCompleto', width: 120 },
     *       { label: 'Valor', key: 'valorMensalidade', width: 60 },
     *     ],
     *   },
     * );
     */
    static async writeTable<T extends Record<string, unknown>>(
        document: PDFKit.PDFDocument,
        rows: AsyncGenerator<T[]>,
        options: PdfTableOptions<T>,
    ): Promise<void> {
        const {
            title,
            columns,
            rowHeight = 15,
            headerFontSize = 6,
            rowFontSize = 5.5,
            headerBgColor = '#0D1B48',
            headerTextColor = '#FFFFFF',
            cellBorderColor = '#D1D5DB',
        } = options;

        const startX = document.page.margins.left;
        const bottomLimit = document.page.height - document.page.margins.bottom - rowHeight;

        // ── Cabeçalho ─────────────────────────────────────────────────────────────
        const drawHeader = (): number => {
            document
                .font('Helvetica-Bold')
                .fontSize(12)
                .fillColor('#000000')
                .text(title, startX, 20, { align: 'center' });

            let x = startX;
            const y = 42;

            document.fontSize(headerFontSize).fillColor(headerTextColor);

            for (const col of columns) {
                document.rect(x, y, col.width, rowHeight).fill(headerBgColor);
                document.fillColor(headerTextColor).text(col.label, x + 2, y + 4, {
                    width: col.width - 4,
                    height: rowHeight - 4,
                    ellipsis: true,
                });
                x += col.width;
            }

            document.fillColor('#000000').font('Helvetica');
            return y + rowHeight;
        };

        // ── Linhas ────────────────────────────────────────────────────────────────
        let y = drawHeader();

        for await (const batch of rows) {
            for (const row of batch) {
                if (y > bottomLimit) {
                    document.addPage();
                    y = drawHeader();
                }

                let x = startX;
                document.fontSize(rowFontSize);

                for (const col of columns) {
                    const value = row[col.key as string];
                    document.rect(x, y, col.width, rowHeight).stroke(cellBorderColor);
                    document.text(value === null || value === undefined ? '' : String(value), x + 2, y + 4, {
                        width: col.width - 4,
                        height: rowHeight - 4,
                        ellipsis: true,
                    });
                    x += col.width;
                }

                y += rowHeight;
            }
        }
    }
}
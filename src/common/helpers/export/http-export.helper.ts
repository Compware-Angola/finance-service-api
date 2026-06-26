import { Response } from 'express';
import PDFDocument from 'pdfkit';

export type PdfDocumentOptions = ConstructorParameters<typeof PDFDocument>[0];

/**
 * HttpExportHelper
 * Centraliza os headers, o pipe e o flush de respostas de exportação
 * (CSV streaming e PDF via PDFKit) nos controllers NestJS.
 */
export class HttpExportHelper {
    // ── CSV ─────────────────────────────────────────────────────────────────────

    /**
     * Faz stream de um AsyncGenerator de chunks de texto como resposta CSV.
     *
     * @example
     * // controller
     * await HttpExportHelper.streamCsv(
     *   response,
     *   'mensalidades-pagas',
     *   this.paymentService.exportPaymentMonthly(query),
     * );
     */
    static async streamCsv(
        response: Response,
        fileBaseName: string,
        chunks: AsyncGenerator<string>,
    ): Promise<void> {
        const fileName = HttpExportHelper.buildFileName(fileBaseName, 'csv');

        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        response.setHeader('Cache-Control', 'no-store');

        for await (const chunk of chunks) {
            if (!response.write(chunk)) {
                // Aguarda drenagem do buffer antes de continuar (back-pressure)
                await new Promise<void>((resolve) => response.once('drain', resolve));
            }
        }

        response.end();
    }

    // ── PDF ─────────────────────────────────────────────────────────────────────

    /**
     * Cria um PDFDocument, faz pipe para a Response e chama o writer fornecido.
     *
     * @param writer   Função assíncrona que recebe o documento e escreve nele
     * @param pdfOptions  Opções passadas ao construtor do PDFDocument
     *
     * @example
     * // controller
     * await HttpExportHelper.streamPdf(
     *   response,
     *   'mensalidades-pagas',
     *   (doc) => this.paymentService.writePaymentMonthlyPdf(query, doc),
     *   { size: 'A4', layout: 'landscape', margin: 24 },
     * );
     */
    static async streamPdf(
        response: Response,
        fileBaseName: string,
        writer: (document: PDFKit.PDFDocument) => Promise<void>,
        pdfOptions: PdfDocumentOptions = {},
    ): Promise<void> {
        const fileName = HttpExportHelper.buildFileName(fileBaseName, 'pdf');

        response.setHeader('Content-Type', 'application/pdf');
        response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        response.setHeader('Cache-Control', 'no-store');

        const document = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 24,
            bufferPages: false,
            ...pdfOptions,
        });

        document.pipe(response);
        await writer(document);
        document.end();
    }

    // ── Util ─────────────────────────────────────────────────────────────────────

    private static buildFileName(base: string, ext: string): string {
        const date = new Date().toISOString().slice(0, 10);
        return `${base}-${date}.${ext}`;
    }
}
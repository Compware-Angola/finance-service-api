import { Response } from 'express';
import PDFDocument = require('pdfkit');

export type PdfDocumentOptions = ConstructorParameters<typeof PDFDocument>[0];

/**
 * HttpExportHelper
 * Centraliza os headers, o pipe e o flush de respostas de exportação
 * (CSV streaming e PDF via PDFKit) nos controllers NestJS.
 */
export class HttpExportHelper {
  // ── CSV ─────────────────────────────────────────────────────────────────────

  static async streamCsv(
    response: Response,
    fileBaseName: string,
    chunks: AsyncGenerator<string>,
  ): Promise<void> {
    const fileName = HttpExportHelper.buildFileName(fileBaseName, 'csv');

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');

    for await (const chunk of chunks) {
      if (!response.write(chunk)) {
        await new Promise<void>((resolve) => response.once('drain', resolve));
      }
    }

    response.end();
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────

  static async streamPdf(
    response: Response,
    fileBaseName: string,
    writer: (document: PDFKit.PDFDocument) => Promise<void>, // Tipo correto
    pdfOptions: PdfDocumentOptions = {},
  ): Promise<void> {
    const fileName = HttpExportHelper.buildFileName(fileBaseName, 'pdf');

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
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

  // ── Excel ───────────────────────────────────────────────────────────────────

  static async streamExcel(
    response: Response,
    fileBaseName: string,
    writer: () => Promise<Buffer>,
  ): Promise<void> {
    const fileName = HttpExportHelper.buildFileName(fileBaseName, 'xlsx');
    const buffer = await writer();

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    response.end(buffer);
  }

  // ── Util ─────────────────────────────────────────────────────────────────────

  private static buildFileName(base: string, ext: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${base}-${date}.${ext}`;
  }
}

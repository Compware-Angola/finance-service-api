import * as ExcelJS from 'exceljs';

export interface ExcelColumn<T> {
  label: string;
  key: keyof T;
  width?: number;
}

export interface ExcelTableOptions<T> {
  title: string;
  sheetName?: string;
  columns: ExcelColumn<T>[];
}

export class ExcelExportHelper {
  static async buildWorkbookBuffer<T extends Record<string, unknown>>(
    rows: AsyncGenerator<T[]>,
    options: ExcelTableOptions<T>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'finance-service-api';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(options.sheetName ?? 'Relatorio');
    const lastColumn = Math.max(options.columns.length, 1);

    worksheet.mergeCells(1, 1, 1, lastColumn);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = options.title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow(options.columns.map((column) => column.label));

    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D1B48' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    for await (const batch of rows) {
      for (const row of batch) {
        worksheet.addRow(
          options.columns.map((column) => {
            const value = row[column.key as string];
            return value === null || value === undefined ? '' : value;
          }),
        );
      }
    }

    worksheet.columns = options.columns.map((column) => ({
      width: column.width ?? 18,
    }));
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }
}

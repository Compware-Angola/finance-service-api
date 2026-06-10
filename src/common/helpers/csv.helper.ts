export class CsvHelper {
  static formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    let text = String(value).replace(/\r?\n|\r/g, ' ').trim();

    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }
}

import type { IExcelGenerator, ExcelColumn } from "@/application/ports/services";

export class ExcelGeneratorService implements IExcelGenerator {
  generateHeaders(columns: ExcelColumn[]): string[] {
    return columns.map((c) => c.header);
  }

  async generateExport(
    data: Record<string, unknown>[],
    columns: ExcelColumn[],
  ): Promise<ArrayBuffer> {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Export");

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    headerRow.font = { bold: true };

    for (const row of data) {
      sheet.addRow(columns.map((c) => row[c.key] ?? ""));
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      if (col.width) {
        sheet.getColumn(i + 1).width = col.width;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }
}

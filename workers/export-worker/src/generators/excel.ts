import ExcelJS from "exceljs";

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

export async function generateExcel(
  data: Record<string, unknown>[],
  columns: ExcelColumn[],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");

  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };

  for (const col of columns) {
    if (col.width) {
      sheet.getColumn(columns.indexOf(col) + 1).width = col.width;
    }
  }

  for (const row of data) {
    sheet.addRow(columns.map((c) => row[c.key] ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function generateExcelFromExport(
  reportData: { rows: Record<string, unknown>[]; columns: ExcelColumn[] },
): Promise<ArrayBuffer> {
  return generateExcel(reportData.rows, reportData.columns);
}

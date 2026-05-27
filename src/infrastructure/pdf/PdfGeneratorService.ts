import type { IPdfGenerator, PdfOptions } from "@/application/ports/services";

export class PdfGeneratorService implements IPdfGenerator {
  async generateReport(
    template: string,
    data: Record<string, unknown>,
    options?: PdfOptions,
  ): Promise<any> {
    const ReactPDF = await import("@react-pdf/renderer");
    const React = await import("react");

    const styles = ReactPDF.StyleSheet.create({
      page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
      title: { fontSize: 24, marginBottom: 20, fontWeight: "bold" },
      heading: { fontSize: 16, marginBottom: 12, fontWeight: "bold" },
      text: { marginBottom: 8, lineHeight: 1.5 },
      table: { marginTop: 16 },
      row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        paddingVertical: 6,
      },
      header: { fontWeight: "bold", backgroundColor: "#f5f5f5" },
      cell: { flex: 1, paddingHorizontal: 4 },
    });

    const pageTitle = (data.title as string) || template;
    const rows = (data.rows as Record<string, unknown>[]) || [];
    const columns = (data.columns as string[]) || [];

    const children: React.ReactNode[] = [];

    children.push(React.createElement(ReactPDF.Text, { style: styles.title, key: "title" }, pageTitle));

    if (data.description) {
      children.push(
        React.createElement(ReactPDF.Text, { style: styles.text, key: "desc" }, String(data.description)),
      );
    }

    if (rows.length > 0 && columns.length > 0) {
      const headerCells = columns.map((col, i) =>
        React.createElement(ReactPDF.Text, { style: styles.cell, key: `hdr-${i}` }, col),
      );
      const headerRow = React.createElement(ReactPDF.View, { style: [styles.row, styles.header], key: "hdr" }, ...headerCells);

      const dataRows = rows.map((row, ri) => {
        const cells = columns.map((col, ci) =>
          React.createElement(ReactPDF.Text, { style: styles.cell, key: `cell-${ri}-${ci}` }, String(row[col] ?? "")),
        );
        return React.createElement(ReactPDF.View, { style: styles.row, key: `row-${ri}` }, ...cells);
      });

      children.push(
        React.createElement(ReactPDF.View, { style: styles.table, key: "table" }, headerRow, ...dataRows),
      );
    }

    const page = React.createElement(
      ReactPDF.Page,
      {
        size: options?.format ?? "A4",
        orientation: options?.orientation ?? "portrait",
        style: styles.page,
      } as any,
      ...children,
    );

    const doc = React.createElement(ReactPDF.Document, null, page);

    const stream = await ReactPDF.renderToStream(doc);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).buffer as ArrayBuffer;
  }
}

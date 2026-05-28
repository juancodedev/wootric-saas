import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
  },
});

interface PdfColumn {
  key: string;
  header: string;
}

interface PdfReportData {
  title: string;
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  generatedAt: string;
}

function ExportDocument({ data }: { data: PdfReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{data.title}</Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {data.columns.map((col) => (
              <Text key={col.key} style={styles.tableCell}>
                {col.header}
              </Text>
            ))}
          </View>

          {data.rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              {data.columns.map((col) => (
                <Text key={col.key} style={styles.tableCell}>
                  {String(row[col.key] ?? "")}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generated on {data.generatedAt} — Wootric Analytics
        </Text>
      </Page>
    </Document>
  );
}

export async function generatePdf(
  data: PdfReportData,
): Promise<ArrayBuffer> {
  const buf = await renderToBuffer(<ExportDocument data={data} />);
  return buf.buffer as ArrayBuffer;
}

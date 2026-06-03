import type { ExportJobMessage, Env } from "./types";
import { createSupabaseClient } from "./supabase";
import { generateExcelFromExport } from "./generators/excel";
import { generatePdf } from "./generators/pdf";

function log(level: string, message: string, ...args: unknown[]): void {
  console.log(JSON.stringify({ level, message, args, timestamp: new Date().toISOString() }));
}

const ALLOWED_EXPORT_TABLES = new Set([
  "wootric_responses",
  "dashboards",
  "dashboard_widgets",
  "reports",
  "export_history",
  "audit_logs",
]);

function sanitizeTableName(table: string): string {
  // Only allow alphanumeric and underscores — reject anything else
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  if (!ALLOWED_EXPORT_TABLES.has(table)) {
    throw new Error(`Table not allowed for export: ${table}`);
  }
  return table;
}

async function fetchReportData(
  env: Env,
  tenantId: string,
  reportId?: string,
  filters?: Record<string, unknown>,
): Promise<{
  rows: Record<string, unknown>[];
  columns: { key: string; header: string; width?: number }[];
  title: string;
}> {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (reportId) {
    const res = await fetch(
      `${url}/rest/v1/reports?id=eq.${reportId}&tenant_id=eq.${tenantId}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
      },
    );

    if (res.ok) {
      const reports = await res.json() as Record<string, unknown>[];
      const report = reports[0];
      if (report?.config) {
        const config = report.config as Record<string, unknown>;
        if (config.source_table) {
          return fetchTableData(url, key, sanitizeTableName(config.source_table as string), tenantId, filters);
        }
      }
    }
  }

  return fetchTableData(url, key, "dashboard_widgets", tenantId, filters);
}

const EXPORT_PAGE_SIZE = 1000;

async function fetchTableData(
  url: string,
  key: string,
  table: string,
  tenantId: string,
  filters?: Record<string, unknown>,
): Promise<{
  rows: Record<string, unknown>[];
  columns: { key: string; header: string; width?: number }[];
  title: string;
  truncated?: boolean;
}> {
  const safeTable = sanitizeTableName(table);

  // Build base query parts
  const filterParams: string[] = [`tenant_id=eq.${tenantId}`];
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
        filterParams.push(`${col}=eq.${encodeURIComponent(String(val))}`);
      }
    }
  }

  const allRows: Record<string, unknown>[] = [];
  let from = 0;
  let truncated = false;

  // Paginate to fetch all rows
  while (true) {
    const to = from + EXPORT_PAGE_SIZE - 1;
    const queryUrl = `${url}/rest/v1/${safeTable}?select=*&${filterParams.join("&")}&order=created_at.asc&offset=${from}&limit=${EXPORT_PAGE_SIZE}`;

    const res = await fetch(queryUrl, {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch data from ${table}: ${res.status}`);
    }

    const rows: Record<string, unknown>[] = await res.json();
    allRows.push(...rows);

    if (rows.length < EXPORT_PAGE_SIZE) {
      break; // Last page
    }

    from += EXPORT_PAGE_SIZE;

    // Safety: cap at 100k rows to prevent runaway fetches
    if (allRows.length >= 100_000) {
      truncated = true;
      log("warn", `Export truncated at 100,000 rows for table ${table}`);
      break;
    }
  }

  if (allRows.length === 0) {
    return { rows: [], columns: [], title: `Export: ${table}` };
  }

  const sampleKeys = Object.keys(allRows[0]!).filter(
    (k) => !k.startsWith("_") && !k.endsWith("_at"),
  );

  const columns = sampleKeys.map((colKey) => ({
    key: colKey,
    header: colKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  return {
    rows: allRows,
    columns,
    title: `Export: ${table}`,
    truncated,
  };
}

async function processExport(
  msg: ExportJobMessage,
  env: Env,
): Promise<void> {
  const startTime = Date.now();
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  log("info", `Processing export ${msg.exportId} (${msg.format}) for tenant ${msg.tenantId}`);

  const reportData = await fetchReportData(
    env,
    msg.tenantId,
    msg.reportId,
    msg.filters,
  );

  if (reportData.rows.length === 0) {
    log("warn", `Export ${msg.exportId}: no data found`);
    await supabase.updateExportStatus(msg.exportId, {
      status: "completed",
      file_name: `${msg.exportId}.${msg.format}`,
      file_size: 0,
      record_count: 0,
      duration_ms: Date.now() - startTime,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>);
    return;
  }

  let buffer: ArrayBuffer;
  let contentType: string;
  let extension: string;

  if (msg.format === "excel") {
    buffer = await generateExcelFromExport({
      rows: reportData.rows,
      columns: reportData.columns,
    });
    contentType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    extension = "xlsx";
  } else {
    buffer = await generatePdf({
      title: reportData.title,
      columns: reportData.columns,
      rows: reportData.rows,
      generatedAt: new Date().toISOString(),
    });
    contentType = "application/pdf";
    extension = "pdf";
  }

  const r2Key = `exports/${msg.tenantId}/${msg.exportId}.${extension}`;

  await env.R2_EXPORTS.put(r2Key, buffer, {
    httpMetadata: { contentType },
  });

  const fileName = `${reportData.title.replace(/\s+/g, "_").toLowerCase()}.${extension}`;
  const durationMs = Date.now() - startTime;

  await supabase.updateExportStatus(msg.exportId, {
    status: "completed",
    r2_key: r2Key,
    file_name: fileName,
    file_size: buffer.byteLength,
    record_count: reportData.rows.length,
    duration_ms: durationMs,
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>);

  log("info", `Export ${msg.exportId} completed: ${reportData.rows.length} records, ${buffer.byteLength} bytes, ${durationMs}ms`);
}

async function failExport(
  exportId: string,
  errorMessage: string,
  env: Env,
): Promise<void> {
  try {
    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase.updateExportStatus(exportId, {
      status: "failed",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>);
  } catch (dbError) {
    log("error", `Failed to update export ${exportId} as failed: ${dbError}`);
  }
}

const worker = {
  async queue(
    batch: MessageBatch<ExportJobMessage>,
    env: Env,
  ): Promise<void> {
    const results: Promise<void>[] = [];

    for (const msg of batch.messages) {
      results.push(
        (async () => {
          try {
            await processExport(msg.body, env);
            msg.ack();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
              log("error", `Export ${msg.body.exportId} failed (attempt ${msg.attempts}): ${message}`);

            if (msg.attempts < 3) {
              msg.retry({ delaySeconds: Math.pow(10, msg.attempts) });
            } else {
      log("error", `Export ${msg.body.exportId} permanently failed after 3 attempts: ${message}`);
      await failExport(msg.body.exportId, message, env);
      msg.ack();
            }
          }
        })(),
      );
    }

    await Promise.allSettled(results);
  },
};

export default worker;

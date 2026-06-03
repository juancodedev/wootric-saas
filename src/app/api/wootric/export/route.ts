import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type ExportRow = {
  wootric_id: number;
  survey_id: number;
  email: string | null;
  score: number | null;
  text: string | null;
  wootric_created_at: string;
  wootric_updated_at: string | null;
  origin_url: string | null;
  ip_address: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
      format?: string;
    };

    const format = body.format === "excel" ? "excel" : "csv";
    const admin = createSupabaseAdmin();

    let query = admin
      .from("wootric_responses")
      .select("wootric_id, survey_id, email, score, text, wootric_created_at, wootric_updated_at, origin_url, ip_address", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("wootric_created_at", { ascending: true });

    if (body.startDate) {
      const start = new Date(body.startDate);
      query = query.gte("wootric_created_at", start.toISOString());
    }
    if (body.endDate) {
      const end = new Date(body.endDate);
      query = query.lte("wootric_created_at", end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Export query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No responses found for the selected date range" },
        { status: 404 },
      );
    }

    const rows = data as unknown as ExportRow[];

    if (format === "excel") {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Wootric Responses");

      sheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Survey ID", key: "survey_id", width: 12 },
        { header: "Email", key: "email", width: 30 },
        { header: "Score", key: "score", width: 8 },
        { header: "Comment", key: "comment", width: 50 },
        { header: "Created At", key: "created_at", width: 22 },
        { header: "Updated At", key: "updated_at", width: 22 },
        { header: "Origin URL", key: "origin_url", width: 40 },
        { header: "IP Address", key: "ip_address", width: 15 },
      ];

      sheet.getRow(1).font = { bold: true };

      for (const r of rows) {
        sheet.addRow({
          id: r.wootric_id,
          survey_id: r.survey_id,
          email: r.email ?? "",
          score: r.score ?? "",
          comment: r.text ?? "",
          created_at: r.wootric_created_at,
          updated_at: r.wootric_updated_at ?? "",
          origin_url: r.origin_url ?? "",
          ip_address: r.ip_address ?? "",
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `wootric-responses-${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.byteLength),
        },
      });
    }

    // CSV
    const csvHeaders = [
      "ID",
      "Survey ID",
      "Email",
      "Score",
      "Comment",
      "Created At",
      "Updated At",
      "Origin URL",
      "IP Address",
    ];

    const csvRows = rows.map((r) => [
      r.wootric_id,
      r.survey_id,
      r.email,
      r.score,
      r.text,
      r.wootric_created_at,
      r.wootric_updated_at,
      r.origin_url,
      r.ip_address,
    ]);

    const bom = "\uFEFF";
    const csvContent = bom + [
      csvHeaders.map(escapeCsv).join(","),
      ...csvRows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const filename = `wootric-responses-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Export error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WootricService } from "@/application/services/WootricService";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

async function getWootricConfig(tenantId: string): Promise<Record<string, unknown> | null> {
  const admin = createSupabaseAdmin();
  const { data: configRow } = await admin
    .from("tenant_config")
    .select("settings")
    .eq("tenant_id", tenantId)
    .single();

  const wootric = (configRow?.settings as Record<string, unknown>)?.wootric as Record<string, unknown> | undefined;
  return wootric ?? null;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

    const wootric = await getWootricConfig(tenantId);
    if (!wootric?.api_url || !wootric?.email || !wootric?.password) {
      return NextResponse.json(
        { error: "Wootric not configured" },
        { status: 400 },
      );
    }

    const format = body.format === "excel" ? "excel" : "csv";

    const client = new WootricService({
      apiUrl: wootric.api_url as string,
      email: wootric.email as string,
      password: wootric.password as string,
      accessToken: (wootric.access_token as string) ?? undefined,
      refreshToken: (wootric.refresh_token as string) ?? undefined,
      expiresAt: (wootric.expires_at as number) ?? undefined,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const result = await client.fetchAllResponses({
        startDate: body.startDate,
        endDate: body.endDate,
        signal: controller.signal,
        maxPages: 50,
      });

      if (result.responses.length === 0) {
        return NextResponse.json(
          { error: "No responses found for the selected date range" },
          { status: 404 },
        );
      }

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
          { header: "Segment", key: "segment", width: 15 },
          { header: "Origin URL", key: "origin_url", width: 40 },
          { header: "IP Address", key: "ip_address", width: 15 },
        ];

        sheet.getRow(1).font = { bold: true };

        for (const r of result.responses) {
          sheet.addRow({
            id: r.id,
            survey_id: r.survey_id,
            email: r.email ?? "",
            score: r.score ?? "",
            comment: r.comment ?? "",
            created_at: r.created_at,
            updated_at: r.updated_at ?? "",
            segment: r.segment ?? "",
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
      const headers = [
        "ID",
        "Survey ID",
        "Email",
        "Score",
        "Comment",
        "Created At",
        "Updated At",
        "Segment",
        "Origin URL",
        "IP Address",
      ];

      const rows = result.responses.map((r) => [
        r.id,
        r.survey_id,
        r.email,
        r.score,
        r.comment,
        r.created_at,
        r.updated_at,
        r.segment,
        r.origin_url,
        r.ip_address,
      ]);

      const bom = "\uFEFF";
      const csvContent = bom + [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) => row.map(escapeCsv).join(",")),
      ].join("\n");

      const filename = `wootric-responses-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Wootric export error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

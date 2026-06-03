import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ExportService } from "@/application/services/ExportService";
import type { InitExportRequest } from "@/presentation/dtos/report";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "No tenant/user context" }, { status: 401 });
    }

    const body = (await request.json()) as InitExportRequest;
    if (!body.format || !["excel", "pdf"].includes(body.format)) {
      return NextResponse.json(
        { error: "format must be 'excel' or 'pdf'" },
        { status: 400 },
      );
    }

    const exportService = new ExportService();
    const exportId = await exportService.initExport({
      tenantId,
      userId,
      format: body.format,
      reportId: id,
      filters: body.filters,
    });

    return NextResponse.json(
      { jobId: exportId, status: "processing" },
      { status: 202 },
    );
  } catch (err) {
    console.error("Export init error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: err instanceof Error && err.message.includes("Quota exceeded") ? 429 : 500 },
    );
  }
}

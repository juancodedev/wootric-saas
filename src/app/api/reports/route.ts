import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ReportService } from "@/application/services/ReportService";
import { createReportSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const service = new ReportService();
    const reports = await service.findByTenant(tenantId, {
      includeDeleted: request.nextUrl.searchParams.get("include_deleted") === "true",
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        reportType: r.reportType,
        config: r.config,
        isScheduled: r.isScheduled,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Reports fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "No tenant/user context" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, description, reportType, config } = parsed.data;

    const service = new ReportService();
    const report = await service.create({
      tenantId,
      userId,
      name,
      description,
      reportType,
      config,
    });

    return NextResponse.json(
      {
        id: report.id,
        name: report.name,
        description: report.description ?? null,
        reportType: report.reportType,
        config: report.config,
        isScheduled: report.isScheduled,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Report create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ReportService } from "@/application/services/ReportService";
import type { UpdateReportRequest } from "@/presentation/dtos/report";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = new ReportService();
    const report = await service.findById(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      name: report.name,
      description: report.description ?? null,
      reportType: report.reportType,
      config: report.config,
      isScheduled: report.isScheduled,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Report fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateReportRequest;

    const service = new ReportService();
    const report = await service.update(id, body);

    return NextResponse.json({
      id: report.id,
      name: report.name,
      description: report.description ?? null,
      reportType: report.reportType,
      config: report.config,
      isScheduled: report.isScheduled,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Report update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = new ReportService();
    await service.softDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Report delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

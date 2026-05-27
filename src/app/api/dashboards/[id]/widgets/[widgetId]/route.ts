import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DashboardService } from "@/application/services/DashboardService";
import type { UpdateWidgetRequest } from "@/presentation/dtos/dashboard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> },
) {
  try {
    const { widgetId } = await params;
    const body = (await request.json()) as UpdateWidgetRequest;

    const service = new DashboardService();
    const widget = await service.updateWidget(widgetId, body);

    return NextResponse.json({
      id: widget.id,
      dashboardId: widget.dashboardId,
      widgetType: widget.widgetType,
      title: widget.title,
      config: widget.config,
      position: widget.position ?? null,
      sortOrder: widget.sortOrder,
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Widget update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> },
) {
  try {
    const { widgetId } = await params;
    const service = new DashboardService();
    await service.deleteWidget(widgetId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Widget delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

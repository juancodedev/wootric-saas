import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DashboardService } from "@/application/services/DashboardService";
import type { CreateWidgetRequest } from "@/presentation/dtos/dashboard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = new DashboardService();
    const widgets = await service.findWidgets(id);

    return NextResponse.json({
      widgets: widgets.map((w) => ({
        id: w.id,
        dashboardId: w.dashboardId,
        widgetType: w.widgetType,
        title: w.title,
        config: w.config,
        position: w.position ?? null,
        sortOrder: w.sortOrder,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Widgets fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CreateWidgetRequest;

    if (!body.widgetType?.trim() || !body.title?.trim()) {
      return NextResponse.json(
        { error: "widgetType and title are required" },
        { status: 400 },
      );
    }

    const service = new DashboardService();
    const widget = await service.createWidget({
      dashboardId: id,
      widgetType: body.widgetType.trim(),
      title: body.title.trim(),
      config: body.config,
      position: body.position,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(
      {
        id: widget.id,
        dashboardId: widget.dashboardId,
        widgetType: widget.widgetType,
        title: widget.title,
        config: widget.config,
        position: widget.position ?? null,
        sortOrder: widget.sortOrder,
        createdAt: widget.createdAt.toISOString(),
        updatedAt: widget.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Widget create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

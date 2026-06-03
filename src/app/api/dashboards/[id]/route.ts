import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DashboardService } from "@/application/services/DashboardService";
import type { UpdateDashboardRequest } from "@/presentation/dtos/dashboard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = new DashboardService();
    const dashboard = await service.findById(id);

    if (!dashboard) {
      return NextResponse.json(
        { error: "Dashboard not found" },
        { status: 404 },
      );
    }

    const widgets = await service.findWidgets(id);

    return NextResponse.json({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description ?? null,
      visibility: dashboard.visibility,
      layout: dashboard.layout ?? null,
      isDefault: dashboard.isDefault,
      widgetCount: widgets.length,
      widgets: widgets.map((w) => ({
        id: w.id,
        widgetType: w.widgetType,
        title: w.title,
        config: w.config,
        position: w.position ?? null,
        sortOrder: w.sortOrder,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
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
    const body = (await request.json()) as UpdateDashboardRequest;

    const service = new DashboardService();
    const dashboard = await service.update(id, body);

    return NextResponse.json({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description ?? null,
      visibility: dashboard.visibility,
      layout: dashboard.layout ?? null,
      isDefault: dashboard.isDefault,
      createdAt: dashboard.createdAt.toISOString(),
      updatedAt: dashboard.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Dashboard update error:", err);
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
    const service = new DashboardService();
    await service.softDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Dashboard delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

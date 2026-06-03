import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DashboardService } from "@/application/services/DashboardService";
import type { ReorderWidgetsRequest } from "@/presentation/dtos/dashboard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ReorderWidgetsRequest;

    if (!body.widgetIds?.length) {
      return NextResponse.json(
        { error: "widgetIds array is required" },
        { status: 400 },
      );
    }

    const service = new DashboardService();
    await service.reorderWidgets(id, body.widgetIds);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Widget reorder error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

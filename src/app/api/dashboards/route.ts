import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DashboardService } from "@/application/services/DashboardService";
import { DashboardVisibility } from "@/domain/enums";
import { getAuthContextFromToken } from "@/lib/auth/context";
import { createDashboardSchema } from "@/lib/validation";

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const service = new DashboardService();
    const dashboards = await service.findByTenant(tenantId, {
      includeDeleted: request.nextUrl.searchParams.get("include_deleted") === "true",
    });

    const result = await Promise.all(
      dashboards.map(async (d) => {
        const widgets = await service.findWidgets(d.id);
        return {
          id: d.id,
          name: d.name,
          description: d.description ?? null,
          visibility: d.visibility,
          layout: d.layout ?? null,
          isDefault: d.isDefault,
          widgetCount: widgets.length,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        };
      }),
    );

    return NextResponse.json({ dashboards: result });
  } catch (err) {
    console.error("Dashboards fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContextFromToken(request);
    const tenantId = request.headers.get("x-tenant-id") ?? auth.tenantId;
    const userId = request.headers.get("x-user-id") ?? auth.userId;
    if (!tenantId || !userId) {
      return NextResponse.json({ error: "No tenant/user context" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, description, visibility, layout } = parsed.data;

    const service = new DashboardService();
    const dashboard = await service.create({
      tenantId,
      userId,
      name,
      description,
      visibility: (visibility as DashboardVisibility) ?? DashboardVisibility.PRIVATE,
      layout,
    });

    return NextResponse.json(
      {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description ?? null,
        visibility: dashboard.visibility,
        layout: dashboard.layout ?? null,
        isDefault: dashboard.isDefault,
        createdAt: dashboard.createdAt.toISOString(),
        updatedAt: dashboard.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Dashboard create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

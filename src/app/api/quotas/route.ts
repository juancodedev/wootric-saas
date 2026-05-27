import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { QuotaService } from "@/application/services/QuotaService";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const quotaKey = request.nextUrl.searchParams.get("key");
    const quotas = new QuotaService();

    if (quotaKey) {
      const check = await quotas.checkQuota(tenantId, quotaKey);
      return NextResponse.json({ quotaKey, ...check });
    }

    const allQuotas = await quotas.getQuotas(tenantId);
    return NextResponse.json({ quotas: allQuotas });
  } catch (err) {
    console.error("Quota fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SubscriptionService } from "@/application/services/SubscriptionService";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const subs = new SubscriptionService();
    const [subscription, plans] = await Promise.all([
      subs.getCurrentSubscription(tenantId),
      subs.listAvailablePlans(),
    ]);

    return NextResponse.json({ subscription, plans });
  } catch (err) {
    console.error("Subscription fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

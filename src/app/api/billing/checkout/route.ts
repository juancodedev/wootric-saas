import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      priceId: string;
      interval?: "monthly" | "yearly";
    };

    if (!body.priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id, plan_id, plans!inner(slug)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let customerId = sub?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const { data: tenant } = await admin
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();

      const { data: user } = await admin
        .from("users")
        .select("email, name")
        .eq("id", userId ?? "")
        .single();

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { createCustomer } = await import("@/lib/stripe");
      const customer = await createCustomer(user.email, user.name ?? tenant?.name ?? "", {
        tenant_id: tenantId,
      });
      customerId = customer.id;

      if (sub) {
        await admin.from("subscriptions").update({ stripe_customer_id: customerId }).eq("id", (sub as Record<string, unknown>).id as string);
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await createCheckoutSession(
      customerId,
      body.priceId,
      tenantId,
      `${appUrl}/dashboard/settings/billing?checkout=success`,
      `${appUrl}/dashboard/settings/billing?checkout=cancel`,
      body.interval ?? "monthly",
    );

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Billing checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

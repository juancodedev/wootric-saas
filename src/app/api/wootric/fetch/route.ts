import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WootricService } from "@/application/services/WootricService";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

async function getWootricConfig(tenantId: string): Promise<Record<string, unknown> | null> {
  const admin = createSupabaseAdmin();
  const { data: configRow } = await admin
    .from("tenant_config")
    .select("settings")
    .eq("tenant_id", tenantId)
    .single();

  const wootric = (configRow?.settings as Record<string, unknown>)?.wootric as Record<string, unknown> | undefined;
  return wootric ?? null;
}

function upsertResponses(admin: ReturnType<typeof createSupabaseAdmin>, tenantId: string, items: import("@/application/services/WootricService").WootricResponseItem[]) {
  if (items.length === 0) return null;

  const rows = items.map((item) => ({
    tenant_id: tenantId,
    wootric_id: item.id,
    survey_id: item.survey_id,
    end_user_id: item.end_user_id ?? null,
    email: item.email ?? null,
    score: item.score ?? null,
    text: item.text ?? null,
    origin_url: item.origin_url ?? null,
    ip_address: item.ip_address ?? null,
    wootric_created_at: item.created_at,
    wootric_updated_at: item.updated_at ?? null,
    tags: item.tags ?? [],
    end_user_properties: item.end_user?.properties ?? null,
    synced_at: new Date().toISOString(),
  }));

  return admin.from("wootric_responses").upsert(rows, {
    onConflict: "tenant_id,wootric_id",
    ignoreDuplicates: false,
  });
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
    };

    const wootric = await getWootricConfig(tenantId);
    if (!wootric?.api_url || !wootric?.email || !wootric?.password) {
      return NextResponse.json(
        { error: "Wootric not configured. Go to Integración Wootric to set up credentials." },
        { status: 400 },
      );
    }

    const client = new WootricService({
      apiUrl: wootric.api_url as string,
      email: wootric.email as string,
      password: wootric.password as string,
      accessToken: (wootric.access_token as string) ?? undefined,
      refreshToken: (wootric.refresh_token as string) ?? undefined,
      expiresAt: (wootric.expires_at as number) ?? undefined,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const admin = createSupabaseAdmin();
    let totalSynced = 0;

    try {
      await client.fetchAllResponses({
        startDate: body.startDate,
        endDate: body.endDate,
        signal: controller.signal,
        maxPages: 30,
        onPage: async (items) => {
          const result = await upsertResponses(admin, tenantId, items);
          if (result?.error) console.error("Upsert error on page:", result.error);
          totalSynced += items.length;
        },
      });

      return NextResponse.json({
        source: "fetched",
        recordsSynced: totalSynced,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Wootric fetch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

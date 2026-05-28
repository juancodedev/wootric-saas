import "reflect-metadata";
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

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
      page?: number;
      perPage?: number;
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
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const result = await client.fetchResponses({
        startDate: body.startDate,
        endDate: body.endDate,
        page: body.page ?? 1,
        perPage: Math.min(body.perPage ?? 50, 50),
        signal: controller.signal,
      });

      return NextResponse.json({
        data: result.data,
        meta: {
          totalCount: result.meta.total_count,
          page: result.meta.current_page,
          totalPages: result.meta.total_pages,
          nextPage: result.meta.next_page,
        },
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

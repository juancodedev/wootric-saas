import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";
import { wootricLocalQuerySchema } from "@/lib/validation";

type WootricResponseRow = {
  id: string;
  wootric_id: number;
  survey_id: number;
  email: string | null;
  score: number | null;
  text: string | null;
  origin_url: string | null;
  ip_address: string | null;
  wootric_created_at: string;
  wootric_updated_at: string | null;
  tags: string[] | null;
  end_user_properties: Record<string, string> | null;
};

type LocalResponseData = {
  id: number;
  survey_id: number;
  email?: string;
  score?: number;
  text?: string;
  origin_url?: string;
  created_at: string;
  updated_at?: string;
  ip_address?: string;
  tags?: string[];
  end_user?: { properties?: Record<string, string> };
};

function toResponseItem(row: WootricResponseRow): LocalResponseData {
  return {
    id: row.wootric_id,
    survey_id: row.survey_id,
    email: row.email ?? undefined,
    score: row.score ?? undefined,
    text: row.text ?? undefined,
    origin_url: row.origin_url ?? undefined,
    created_at: row.wootric_created_at,
    updated_at: row.wootric_updated_at ?? undefined,
    ip_address: row.ip_address ?? undefined,
    tags: row.tags ?? undefined,
    end_user: row.end_user_properties
      ? { properties: row.end_user_properties }
      : undefined,
  };
}

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = wootricLocalQuerySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { startDate, endDate, page, perPage } = parsed.data;
    const offset = (page - 1) * perPage;

    const admin = createSupabaseAdmin();

    let query = admin
      .from("wootric_responses")
      .select(
        "wootric_id, survey_id, email, score, text, wootric_created_at, wootric_updated_at, origin_url, ip_address, tags, end_user_properties",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId);

    if (startDate) {
      const start = new Date(startDate);
      query = query.gte("wootric_created_at", start.toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      query = query.lte("wootric_created_at", end.toISOString());
    }

    const { data, error, count } = await query
      .order("wootric_created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error("Local query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { totalCount: 0, page, totalPages: 0, nextPage: null },
        source: "empty",
      });
    }

    const totalPages = Math.ceil((count ?? 0) / perPage);

    return NextResponse.json({
      data: (data as unknown as WootricResponseRow[]).map(toResponseItem),
      meta: {
        totalCount: count ?? 0,
        page,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
      },
      source: "local",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Local query error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

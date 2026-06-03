import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthContextFromToken } from "@/lib/auth/context";
import {
  calculateNps,
  calculateDistribution,
  calculateDailyTrend,
  calculateVolumeTrend,
} from "@/lib/wootric/nps-utils";

type AnalyticsResponse = {
  nps: {
    npsScore: number;
    promoters: { count: number; pct: number };
    passives: { count: number; pct: number };
    detractors: { count: number; pct: number };
    total: number;
    averageScore: number;
  };
  distribution: { score: number; count: number }[];
  trend: { date: string; avgScore: number; count: number }[];
  volume: { date: string; count: number }[];
  totalCount: number;
};

type WootricResponseRow = {
  score: number | null;
  text: string | null;
  wootric_created_at: string;
};

function getTenantId(request: NextRequest): string | null {
  return request.headers.get("x-tenant-id") ?? getAuthContextFromToken(request).tenantId;
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

    const admin = createSupabaseAdmin();

    let query = admin
      .from("wootric_responses")
      .select("score, text, wootric_created_at", { count: "exact" })
      .eq("tenant_id", tenantId);

    if (body.startDate) {
      const start = new Date(body.startDate);
      query = query.gte("wootric_created_at", start.toISOString());
    }
    if (body.endDate) {
      const end = new Date(body.endDate);
      query = query.lte("wootric_created_at", end.toISOString());
    }

    const { data, error, count } = await query.order("wootric_created_at", { ascending: false });

    if (error) {
      console.error("Analytics query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        nps: calculateNps([]),
        distribution: calculateDistribution([]),
        trend: calculateDailyTrend([]),
        volume: calculateVolumeTrend([]),
        totalCount: 0,
      });
    }

    const rows = data as unknown as WootricResponseRow[];

    const npsInput = rows.map((r) => ({
      score: r.score ?? undefined,
      created_at: r.wootric_created_at,
    }));

    const distributionInput = rows.map((r) => ({
      score: r.score ?? undefined,
    }));

    const trendInput = rows.map((r) => ({
      score: r.score ?? undefined,
      created_at: r.wootric_created_at,
    }));

    const volumeInput = rows.map((r) => ({
      created_at: r.wootric_created_at,
    }));

    const response: AnalyticsResponse = {
      nps: calculateNps(npsInput),
      distribution: calculateDistribution(distributionInput),
      trend: calculateDailyTrend(trendInput),
      volume: calculateVolumeTrend(volumeInput),
      totalCount: count ?? rows.length,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analytics query error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

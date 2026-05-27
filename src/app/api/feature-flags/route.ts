import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FeatureFlagService } from "@/application/services/FeatureFlagService";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ?? undefined;
    const ff = new FeatureFlagService();

    const admin = createSupabaseAdmin();
    const { data: allFlags } = await admin
      .from("feature_flags")
      .select("*")
      .order("key");

    const flags = await Promise.all(
      (allFlags ?? []).map(async (f) => ({
        id: f.id,
        key: f.key,
        name: f.name,
        description: f.description,
        isPublic: f.is_public,
        globalEnabled: f.enabled,
        enabled: await ff.isEnabled(f.key, tenantId),
      })),
    );

    return NextResponse.json({ flags });
  } catch (err) {
    console.error("Feature flags fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const body = (await request.json()) as {
      flagKey: string;
      enabled: boolean;
    };

    if (!body.flagKey) {
      return NextResponse.json(
        { error: "flagKey is required" },
        { status: 400 },
      );
    }

    const ff = new FeatureFlagService();
    await ff.setOverride(body.flagKey, tenantId, body.enabled);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feature flag override error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flagKey = searchParams.get("key");
    if (!flagKey) {
      return NextResponse.json(
        { error: "key query param is required" },
        { status: 400 },
      );
    }

    const ff = new FeatureFlagService();
    await ff.removeOverride(flagKey, tenantId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feature flag remove override error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createSupabaseAdmin();
    const { data: plans, error } = await admin
      .from("plans")
      .select("id, name, slug, description, tier, price, interval, features, quotas, is_public, created_at, updated_at")
      .order("price");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Plans fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name: string;
      slug: string;
      description?: string;
      tier: string;
      price: number;
      interval?: string;
      is_public?: boolean;
    };

    if (!body.name?.trim() || !body.slug?.trim() || !body.tier) {
      return NextResponse.json(
        { error: "name, slug, and tier are required" },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("plans")
      .insert({
        name: body.name.trim(),
        slug: body.slug.trim(),
        description: body.description ?? null,
        tier: body.tier,
        price: body.price ?? 0,
        interval: body.interval ?? "month",
        is_public: body.is_public ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (err) {
    console.error("Plan create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("id");
    if (!planId) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      price?: number;
      interval?: string;
      is_public?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.interval !== undefined) updates.interval = body.interval;
    if (body.is_public !== undefined) updates.is_public = body.is_public;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("plans")
      .update(updates)
      .eq("id", planId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Plan update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

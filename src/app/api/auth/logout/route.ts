import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SessionService } from "@/infrastructure/auth/SessionService";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64").toString(),
    );
    const userId = payload.sub as string;

    const sessions = new SessionService();
    await sessions.removeAllForUser(userId);

    // Also invalidate Supabase session
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WootricService } from "@/application/services/WootricService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      apiUrl?: string;
      email?: string;
      password?: string;
    };

    if (!body.apiUrl || !body.email || !body.password) {
      return NextResponse.json(
        { ok: false, message: "API URL, email, and password are required" },
        { status: 400 },
      );
    }

    const client = new WootricService({
      apiUrl: body.apiUrl,
      email: body.email,
      password: body.password,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const result = await client.testConnection(controller.signal);
      return NextResponse.json({
        ok: result.ok,
        message: result.message,
        totalResponses: result.totalResponses,
        expiresIn: result.expiresIn,
        accessToken: result.ok ? (client as unknown as { accessToken: string | null }).accessToken : null,
        refreshToken: result.ok ? (client as unknown as { refreshToken: string | null }).refreshToken : null,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

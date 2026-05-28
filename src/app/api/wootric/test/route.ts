import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { WootricService } from "@/application/services/WootricService";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      apiUrl?: string;
      username?: string;
      password?: string;
    };

    if (!body.apiUrl || !body.username || !body.password) {
      return NextResponse.json(
        { ok: false, message: "API URL, username, and password are required" },
        { status: 400 },
      );
    }

    const client = new WootricService({
      apiUrl: body.apiUrl,
      username: body.username,
      password: body.password,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const result = await client.testConnection(controller.signal);
      return NextResponse.json(result);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

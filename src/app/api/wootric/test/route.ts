import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

    const baseUrl = body.apiUrl.replace(/\/+$/, "");
    const auth = btoa(`${body.username}:${body.password}`);
    const testUrl = new URL("/v1/responses", baseUrl);
    testUrl.searchParams.set("per_page", "1");
    testUrl.searchParams.set("page", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(testUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "User-Agent": "WootricSaaS/1.0",
        },
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const totalCount = (data as { meta?: { total_count?: number } }).meta?.total_count ?? 0;
        return NextResponse.json({
          ok: true,
          message: `Connected successfully. ${totalCount} responses available.`,
          totalResponses: totalCount,
        });
      }

      if (res.status === 401) {
        return NextResponse.json({
          ok: false,
          message: "Invalid credentials (HTTP 401). Check your username and password.",
        });
      }

      if (res.status === 429) {
        return NextResponse.json({
          ok: false,
          message: "Rate limited (HTTP 429). Try again in a moment.",
        });
      }

      return NextResponse.json({
        ok: false,
        message: `API responded with HTTP ${res.status} ${res.statusText}`,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort")) {
      return NextResponse.json({
        ok: false,
        message: "Connection timed out after 10 seconds. Check the API URL.",
      });
    }
    return NextResponse.json(
      { ok: false, message },
      { status: 500 },
    );
  }
}

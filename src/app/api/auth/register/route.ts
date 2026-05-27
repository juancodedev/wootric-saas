import "reflect-metadata";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RegistrationService } from "@/infrastructure/auth/RegistrationService";
import type { RegisterRequest, AuthResponse } from "@/presentation/dtos/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest;

    if (!body.email || !body.password || !body.name || !body.companyName || !body.slug) {
      return NextResponse.json(
        { error: "All fields are required: email, password, name, companyName, slug" },
        { status: 400 },
      );
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const registration = new RegistrationService();
    const result = await registration.register(body);

    const response: AuthResponse = {
      user: {
        id: result.userId,
        email: body.email,
        name: body.name,
        tenantId: result.tenantId,
      },
      session: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.session.expiresAt.toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("already exists") ||
        err.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "Email or slug already in use" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

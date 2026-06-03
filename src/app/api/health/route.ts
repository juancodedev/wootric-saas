import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
  };

  const allOk = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "missing_vars",
      vars: checks,
    },
    { status: allOk ? 200 : 500 },
  );
}

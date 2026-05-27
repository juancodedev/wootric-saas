import type { NextRequest, NextResponse } from "next/server";

export type TenantInfo = {
  id: string;
  slug: string;
} | null;

export type AuthInfo = {
  userId: string;
  tenantId: string;
  email: string;
  sessionId: string;
} | null;

export interface MiddlewareContext {
  request: NextRequest;
  response: NextResponse;
  tenant: TenantInfo;
  auth: AuthInfo;
}

export type MiddlewareHandler = (
  context: MiddlewareContext,
) => Promise<MiddlewareContext>;

// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  companyName: string;
  slug: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface InviteRequest {
  email: string;
  roleSlug: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    tenantId: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roleIds: string[];
  permissions: string[];
}

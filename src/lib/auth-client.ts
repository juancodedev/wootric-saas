const TOKEN_KEY = "wootric_access_token";
const REFRESH_KEY = "wootric_refresh_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(access: string, refresh?: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const data = await apiFetch<{
    session: { accessToken: string; refreshToken: string };
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(data.session.accessToken, data.session.refreshToken);
  return data.session;
}

export async function register(params: {
  email: string;
  password: string;
  name: string;
  companyName: string;
  slug: string;
}): Promise<void> {
  const data = await apiFetch<{
    session: { accessToken: string; refreshToken: string };
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(params),
  });

  setToken(data.session.accessToken, data.session.refreshToken);
}

export function logout(): void {
  clearTokens();
  window.location.href = "/login";
}

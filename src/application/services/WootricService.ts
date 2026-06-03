type WootricCredentials = {
  apiUrl: string;
  email: string;
  password: string;
};

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type WootricResponseItem = {
  id: number;
  end_user_id?: number;
  survey_id: number;
  email?: string;
  score?: number;
  text?: string;
  comment?: string;
  origin_url?: string;
  created_at: string;
  updated_at?: string;
  segment?: string;
  ip_address?: string;
  tags?: string[];
  end_user?: { properties?: Record<string, string> };
};

type WootricApiResponse = {
  id: number;
  end_user_id: number;
  survey_id: number;
  score: number;
  text: string | null;
  completed: boolean;
  excluded_from_calculations: boolean;
  ip_address: string | null;
  origin_url: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  notes: string[];
  end_user: { properties: Record<string, string> } | null;
};

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export class WootricService {
  private apiUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;
  private lastRequestTime = 0;
  private minRequestIntervalMs: number;
  private email: string;
  private password: string;

  constructor(credentials: WootricCredentials & Partial<StoredTokens>, rpmLimit = 100) {
    this.apiUrl = credentials.apiUrl.replace(/\/+$/, "");
    this.email = credentials.email;
    this.password = credentials.password;
    this.accessToken = credentials.accessToken ?? null;
    this.refreshToken = credentials.refreshToken ?? null;
    this.expiresAt = credentials.expiresAt ?? null;
    this.minRequestIntervalMs = Math.ceil(60000 / rpmLimit);
  }

  get tokenInfo(): { hasToken: boolean; expiresAt: number | null } {
    return { hasToken: !!this.accessToken, expiresAt: this.expiresAt };
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestIntervalMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestIntervalMs - elapsed),
      );
    }
    this.lastRequestTime = Date.now();
  }

  // ── OAuth ──

  private isTokenExpired(): boolean {
    if (!this.accessToken || !this.expiresAt) return true;
    return Date.now() >= this.expiresAt * 1000;
  }

  async authenticate(signal?: AbortSignal): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const url = new URL("/oauth/token", this.apiUrl);
    const formData = new URLSearchParams();
    formData.set("grant_type", "password");
    formData.set("username", this.email);
    formData.set("password", this.password);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        res.status === 401
          ? "Invalid credentials"
          : `OAuth token request failed: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async refreshAccessToken(signal?: AbortSignal): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!this.refreshToken) {
      return this.authenticate(signal);
    }

    const url = new URL("/oauth/token", this.apiUrl);
    const formData = new URLSearchParams();
    formData.set("grant_type", "refresh_token");
    formData.set("refresh_token", this.refreshToken);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
      signal,
    });

    if (!res.ok) {
      return this.authenticate(signal);
    }

    const data = (await res.json()) as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async ensureValidToken(signal?: AbortSignal): Promise<string> {
    if (!this.isTokenExpired() && this.accessToken) {
      return this.accessToken;
    }
    await this.refreshAccessToken(signal);
    return this.accessToken!;
  }

  // ── API Request ──

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal,
    _retryCount = 0,
  ): Promise<T> {
    const MAX_RETRIES = 2;

    await this.rateLimit();

    const token = await this.ensureValidToken(signal);

    const url = new URL(path, this.apiUrl);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined) url.searchParams.set(key, String(val));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "WootricSaaS/1.0",
      },
      signal,
    });

    if (res.status === 429) {
      if (_retryCount >= MAX_RETRIES) {
        throw new Error(`Wootric API rate limit exceeded after ${MAX_RETRIES} retries for ${path}`);
      }
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(path, params, signal, _retryCount + 1);
    }

    if (res.status === 401) {
      if (_retryCount >= MAX_RETRIES) {
        throw new Error(`Wootric API authentication failed after ${MAX_RETRIES} retries for ${path}`);
      }
      this.accessToken = null;
      this.expiresAt = null;
      return this.request<T>(path, params, signal, _retryCount + 1);
    }

    if (!res.ok) {
      throw new Error(`Wootric API ${res.status}: ${res.statusText} for ${path}`);
    }

    return res.json();
  }

  // ── Responses ──

  async fetchResponses(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
    signal?: AbortSignal;
  }): Promise<{
    data: WootricResponseItem[];
    meta: { current_page: number; total_pages: number; next_page: number | null; total_count: number };
  }> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page ?? 1,
      per_page: Math.min(params?.perPage ?? 50, 50),
      sort_key: "created_at",
      sort_order: "asc",
    };

    if (params?.startDate) {
      queryParams["created[gte]"] = Math.floor(new Date(params.startDate).getTime() / 1000);
    }
    if (params?.endDate) {
      queryParams["created[lte]"] = Math.floor(new Date(params.endDate).getTime() / 1000);
    }

    const raw = await this.request<WootricApiResponse[]>("/v1/responses", queryParams, params?.signal);

    const items: WootricResponseItem[] = raw.map((r) => ({
      id: r.id,
      end_user_id: r.end_user_id,
      survey_id: r.survey_id,
      email: undefined,
      score: r.score,
      text: r.text ?? undefined,
      comment: r.text ?? undefined,
      origin_url: r.origin_url ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at ?? undefined,
      ip_address: r.ip_address ?? undefined,
      tags: r.tags,
      end_user: r.end_user ?? undefined,
    }));

    const totalCount = items.length;
    const page = params?.page ?? 1;
    const perPage = Math.min(params?.perPage ?? 50, 50);
    const totalPages = totalCount < perPage ? page : page + 1;

    return {
      data: items,
      meta: {
        current_page: page,
        total_pages: totalPages,
        next_page: totalCount >= perPage ? page + 1 : null,
        total_count: totalCount,
      },
    };
  }

  async fetchAllResponses(params?: {
    startDate?: string;
    endDate?: string;
    signal?: AbortSignal;
    onPage?: (responses: WootricResponseItem[], page: number) => Promise<void>;
    maxPages?: number;
  }): Promise<{
    responses: WootricResponseItem[];
    totalCount: number;
    pagesFetched: number;
  }> {
    const startTs = params?.startDate
      ? Math.floor(new Date(params.startDate).getTime() / 1000)
      : 0;
    const endTs = params?.endDate
      ? Math.floor(new Date(params.endDate).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    const perPage = 50;
    const maxPages = params?.maxPages ?? 30;

    const allResponses: WootricResponseItem[] = [];
    const seenIds = new Set<number>();
    let currentStart = startTs;
    let pagesFetched = 0;

    while (currentStart <= endTs) {
      let page = 1;
      let lastTimestamp = currentStart;
      let newRecordsFound = false;

      while (page <= maxPages) {
        const queryParams: Record<string, string | number | undefined> = {
          page,
          per_page: perPage,
          sort_key: "created_at",
          sort_order: "asc",
          "created[gte]": currentStart,
          "created[lte]": endTs,
        };

        const raw = await this.request<WootricApiResponse[]>("/v1/responses", queryParams, params?.signal);

        if (!raw || raw.length === 0) break;

        const pageItems: WootricResponseItem[] = [];

        for (const r of raw) {
          if (seenIds.has(r.id)) continue;
          seenIds.add(r.id);

          const item: WootricResponseItem = {
            id: r.id,
            end_user_id: r.end_user_id,
            survey_id: r.survey_id,
            email: undefined,
            score: r.score,
            text: r.text ?? undefined,
            comment: r.text ?? undefined,
            origin_url: r.origin_url ?? undefined,
            created_at: r.created_at,
            updated_at: r.updated_at ?? undefined,
            ip_address: r.ip_address ?? undefined,
            tags: r.tags,
            end_user: r.end_user ?? undefined,
          };

          pageItems.push(item);
          allResponses.push(item);
          newRecordsFound = true;

          const ts = Math.floor(new Date(r.created_at).getTime() / 1000);
          if (ts > lastTimestamp) lastTimestamp = ts;
        }

        pagesFetched++;

        if (params?.onPage) {
          await params.onPage(pageItems, pagesFetched);
        }

        if (raw.length < perPage) break;

        page++;
      }

      if (!newRecordsFound) break;
      if (lastTimestamp <= currentStart) break;

      currentStart = lastTimestamp + 1;
    }

    return {
      responses: allResponses,
      totalCount: allResponses.length,
      pagesFetched,
    };
  }

  // ── Test Connection ──

  async testConnection(signal?: AbortSignal): Promise<{ ok: boolean; message: string; totalResponses?: number; expiresIn?: number }> {
    try {
      await this.authenticate(signal);
      const expiresIn = this.expiresAt ? Math.floor((this.expiresAt * 1000 - Date.now()) / 1000) : 7200;

      // Verify with a real API call
      try {
        const result = await this.request<WootricApiResponse[]>("/v1/responses", { per_page: 1 }, signal);
        return {
          ok: true,
          message: `Authenticated as ${this.email}. Token expires in ${Math.floor(expiresIn / 60)} min.`,
          totalResponses: result.length,
          expiresIn,
        };
      } catch {
        return {
          ok: true,
          message: `Authenticated as ${this.email}. Token expires in ${Math.floor(expiresIn / 60)} min.`,
          expiresIn,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("abort") || message.includes("Abort")) {
        return { ok: false, message: "Connection timed out" };
      }
      if (message.toLowerCase().includes("invalid credentials") || message.includes("401")) {
        return { ok: false, message: "Invalid email or password. Check your credentials." };
      }
      if (message.includes("429")) {
        return { ok: false, message: "Rate limited (HTTP 429). Try again in a moment." };
      }
      return { ok: false, message };
    }
  }
}

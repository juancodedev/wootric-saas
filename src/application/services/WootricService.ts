type WootricCredentials = {
  apiUrl: string;
  username: string;
  password: string;
};

export type WootricResponseItem = {
  id: number;
  survey_id: number;
  email?: string;
  score?: number;
  comment?: string;
  origin_url?: string;
  created_at: string;
  updated_at?: string;
  segment?: string;
  ip_address?: string;
  properties?: Record<string, string>;
};

type PaginatedResponse = {
  data: WootricResponseItem[];
  meta?: {
    current_page: number;
    next_page?: number;
    total_pages?: number;
    total_count?: number;
  };
};

export class WootricService {
  private credentials: WootricCredentials;
  private lastRequestTime = 0;
  private minRequestIntervalMs: number;

  constructor(credentials: WootricCredentials, rpmLimit = 60) {
    this.credentials = credentials;
    this.minRequestIntervalMs = Math.ceil(60000 / rpmLimit);
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

  private get basicAuth(): string {
    return btoa(`${this.credentials.username}:${this.credentials.password}`);
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ): Promise<T> {
    await this.rateLimit();

    const url = new URL(path, this.credentials.apiUrl.replace(/\/+$/, ""));
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined) url.searchParams.set(key, String(val));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        "User-Agent": "WootricSaaS/1.0",
      },
      signal,
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(path, params, signal);
    }

    if (!res.ok) {
      throw new Error(`Wootric API ${res.status}: ${res.statusText} for ${path}`);
    }

    return res.json();
  }

  async fetchResponses(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse> {
    return this.request<PaginatedResponse>("/v1/responses", {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 100,
      start_date: params?.startDate,
      end_date: params?.endDate,
    }, params?.signal);
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
    let page = 1;
    let totalPages = 1;
    const allResponses: WootricResponseItem[] = [];
    const perPage = 100;

    while (page <= totalPages) {
      if (params?.maxPages && page > params.maxPages) break;

      const result = await this.fetchResponses({
        page,
        perPage,
        startDate: params?.startDate,
        endDate: params?.endDate,
        signal: params?.signal,
      });

      allResponses.push(...result.data);
      totalPages = result.meta?.total_pages ?? 1;

      if (params?.onPage) {
        await params.onPage(result.data, page);
      }

      page++;
    }

    return {
      responses: allResponses,
      totalCount: allResponses.length,
      pagesFetched: page - 1,
    };
  }

  async testConnection(signal?: AbortSignal): Promise<{ ok: boolean; message: string; totalResponses?: number }> {
    try {
      const result = await this.request<PaginatedResponse>("/v1/responses", { per_page: 1 }, signal);
      const totalCount = result.meta?.total_count ?? 0;
      return {
        ok: true,
        message: `Connected successfully. ${totalCount} responses available.`,
        totalResponses: totalCount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("abort") || message.includes("Abort")) {
        return { ok: false, message: "Connection timed out" };
      }
      if (message.includes("401")) {
        return { ok: false, message: "Invalid credentials (HTTP 401). Check your username and password." };
      }
      if (message.includes("429")) {
        return { ok: false, message: "Rate limited (HTTP 429). Try again in a moment." };
      }
      return { ok: false, message };
    }
  }
}

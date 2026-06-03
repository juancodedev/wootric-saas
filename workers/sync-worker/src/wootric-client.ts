import type { WootricCredentials } from "./types";

interface WootricResponse {
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
}

interface PaginatedResponse {
  data: WootricResponse[];
  meta?: {
    current_page: number;
    next_page?: number;
    total_pages?: number;
    total_count?: number;
  };
}

export class WootricApiClient {
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
    _retryCount = 0,
  ): Promise<T> {
    const MAX_RETRIES = 2;

    await this.rateLimit();

    const url = new URL(`${this.credentials.apiUrl}${path}`);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined) {
          url.searchParams.set(key, String(val));
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${this.basicAuth}`,
        Accept: "application/json",
        "User-Agent": "WootricSaaS/1.0",
      },
    });

    if (res.status === 429) {
      if (_retryCount >= MAX_RETRIES) {
        throw new Error(`Wootric API rate limit exceeded after ${MAX_RETRIES} retries for ${path}`);
      }
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 10000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(path, params, _retryCount + 1);
    }

    if (!res.ok) {
      throw new Error(
        `Wootric API ${res.status}: ${res.statusText} for ${path}`,
      );
    }

    return res.json();
  }

  async fetchResponses(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
    segment?: string;
  }): Promise<PaginatedResponse> {
    return this.request<PaginatedResponse>("/v1/responses", {
      page: params?.page ?? 1,
      per_page: params?.perPage ?? 100,
      start_date: params?.startDate,
      end_date: params?.endDate,
      segment: params?.segment,
    });
  }

  async fetchAllResponses(params?: {
    startDate?: string;
    endDate?: string;
    segment?: string;
    onPage?: (responses: WootricResponse[], page: number) => Promise<void>;
  }): Promise<{
    totalCount: number;
    pagesFetched: number;
  }> {
    let page = 1;
    let totalPages = 1;
    let totalCount = 0;
    const perPage = 100;

    while (page <= totalPages) {
      const result = await this.fetchResponses({
        page,
        perPage,
        startDate: params?.startDate,
        endDate: params?.endDate,
        segment: params?.segment,
      });

      totalCount += result.data.length;
      totalPages = result.meta?.total_pages ?? 1;

      if (params?.onPage) {
        await params.onPage(result.data, page);
      }

      page++;
    }

    return {
      totalCount,
      pagesFetched: page - 1,
    };
  }

  getCredentials(): WootricCredentials {
    return this.credentials;
  }
}

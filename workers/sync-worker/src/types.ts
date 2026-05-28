export interface SyncJobMessage {
  tenantId: string;
  userId: string;
  syncType: "full" | "incremental";
}

export interface WootricCredentials {
  apiUrl: string;
  username: string;
  password: string;
}

export interface SyncResult {
  responsesSynced: number;
  errors: number;
  durationMs: number;
  lastSyncAt: string;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WOOTRIC_API_URL: string;
  WOOTRIC_USERNAME: string;
  WOOTRIC_PASSWORD: string;
  LOG_LEVEL?: string;
  SYNC_BATCH_SIZE?: string;
  SYNC_RATE_LIMIT_RPM?: string;
}

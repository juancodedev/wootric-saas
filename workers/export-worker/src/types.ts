export interface ExportJobMessage {
  exportId: string;
  tenantId: string;
  userId: string;
  format: "excel" | "pdf";
  reportId?: string;
  filters?: Record<string, unknown>;
}

export interface ExportHistoryRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  format: string;
  status: string;
  file_name: string | null;
  file_size: number | null;
  record_count: number | null;
  duration_ms: number | null;
  r2_key: string | null;
  error_message: string | null;
  filters: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Env {
  R2_EXPORTS: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  LOG_LEVEL?: string;
}

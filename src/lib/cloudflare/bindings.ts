import type { Queue } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface ExportJobMessage {
  exportId: string;
  tenantId: string;
  userId: string;
  format: "excel" | "pdf";
  reportId?: string;
  filters?: Record<string, unknown>;
}

export interface SyncJobMessage {
  tenantId: string;
  userId: string;
  syncType: "full" | "incremental";
}

export interface BillingEventMessage {
  type: "subscription.updated" | "invoice.paid" | "invoice.failed";
  tenantId: string;
  stripeEventId: string;
  data: Record<string, unknown>;
}

export interface CloudflareBindings {
  KV_CACHE: KVNamespace;
  KV_RATE_LIMIT: KVNamespace;
  KV_SESSIONS: KVNamespace;
  R2_EXPORTS: R2Bucket;
  QUEUE_EXPORTS: Queue<ExportJobMessage>;
  QUEUE_SYNC: Queue<SyncJobMessage>;
  QUEUE_BILLING: Queue<BillingEventMessage>;
  ASSETS: Fetcher;
  EXPORT_WORKER: Fetcher;
  SYNC_WORKER: Fetcher;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_APP_URL: string;
  LOG_LEVEL: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
  STORAGE_BUCKET: string;
}

export type QueueBindingName = "exports" | "sync" | "billing";

export const QUEUE_NAME_MAP: Record<string, keyof CloudflareBindings> = {
  exports: "QUEUE_EXPORTS",
  sync: "QUEUE_SYNC",
  billing: "QUEUE_BILLING",
};

export async function getBindings(): Promise<CloudflareBindings> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as unknown as CloudflareBindings;
}

export function getBindingsSync(): CloudflareBindings {
  const ctx = getCloudflareContext({ async: false });
  return ctx.env as unknown as CloudflareBindings;
}

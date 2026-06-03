import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getBindings } from "@/lib/cloudflare/bindings";
import { QuotaService } from "./QuotaService";

export interface ExportJobMessage {
  exportId: string;
  tenantId: string;
  userId: string;
  format: "excel" | "pdf";
  reportId?: string;
  filters?: Record<string, unknown>;
}

export interface ExportStatusResult {
  id: string;
  status: string;
  format: string;
  fileName: string | null;
  fileSize: number | null;
  recordCount: number | null;
  errorMessage: string | null;
  downloadUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export class ExportService {
  async initExport(params: {
    tenantId: string;
    userId: string;
    format: "excel" | "pdf";
    reportId?: string;
    filters?: Record<string, unknown>;
  }): Promise<string> {
    const quotas = new QuotaService();
    await quotas.requireQuota(params.tenantId, "max_exports");

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("export_history")
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        format: params.format,
        status: "pending",
        filters: params.filters ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create export job: ${error?.message ?? "unknown"}`);
    }

    const exportId = data.id;

    const { QUEUE_EXPORTS } = await getBindings();
    await QUEUE_EXPORTS.send({
      exportId,
      tenantId: params.tenantId,
      userId: params.userId,
      format: params.format,
      reportId: params.reportId,
      filters: params.filters,
    });

    await admin
      .from("export_history")
      .update({ status: "processing" })
      .eq("id", exportId);

    return exportId;
  }

  async getStatus(exportId: string): Promise<ExportStatusResult | null> {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("export_history")
      .select("id, status, format, file_name, file_size, record_count, error_message, r2_key, created_at, completed_at")
      .eq("id", exportId)
      .maybeSingle();

    if (!data) return null;

    let downloadUrl: string | null = null;
    if (data.status === "completed" && data.r2_key) {
      try {
        const { R2_EXPORTS } = await getBindings();
        const bucket = R2_EXPORTS as unknown as {
          createSignedUrl(p: string, o: { expirySeconds: number; signedURL: boolean }): Promise<URL>;
        };
        const url = await bucket.createSignedUrl(data.r2_key, {
          expirySeconds: 3600,
          signedURL: true,
        });
        downloadUrl = url.toString();
      } catch {
        // non-fatal
      }
    }

    return {
      id: data.id,
      status: data.status,
      format: data.format,
      fileName: data.file_name,
      fileSize: data.file_size,
      recordCount: data.record_count,
      errorMessage: data.error_message,
      downloadUrl,
      createdAt: data.created_at,
      completedAt: data.completed_at ?? null,
    };
  }

  async completeExport(
    exportId: string,
    tenantId: string,
    params: {
      r2Key: string;
      fileName: string;
      fileSize: number;
      recordCount: number;
    },
  ): Promise<void> {
    const admin = createSupabaseAdmin();
    await admin
      .from("export_history")
      .update({
        status: "completed",
        r2_key: params.r2Key,
        file_name: params.fileName,
        file_size: params.fileSize,
        record_count: params.recordCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", exportId);

    const quotas = new QuotaService();
    await quotas.incrementQuota(tenantId, "max_exports", 1, "export_completed");
  }

  async failExport(exportId: string, errorMessage: string): Promise<void> {
    const admin = createSupabaseAdmin();
    await admin
      .from("export_history")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", exportId);
  }

  async listByTenant(
    tenantId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ExportStatusResult[]> {
    const admin = createSupabaseAdmin();
    let query = admin
      .from("export_history")
      .select("id, status, format, file_name, file_size, record_count, error_message, created_at, completed_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit ?? 10) - 1);

    const { data } = await query;
    return (data ?? []).map((d) => ({
      id: d.id,
      status: d.status,
      format: d.format,
      fileName: d.file_name,
      fileSize: d.file_size,
      recordCount: d.record_count,
      errorMessage: d.error_message,
      downloadUrl: null,
      createdAt: d.created_at,
      completedAt: d.completed_at ?? null,
    }));
  }
}

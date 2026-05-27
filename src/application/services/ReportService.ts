import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Report } from "@/domain/entities";

interface ReportRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  report_type: string;
  config: Record<string, unknown>;
  is_scheduled: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ReportService {
  async findById(id: string): Promise<Report | null> {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? this.toEntity(data as ReportRow) : null;
  }

  async findByTenant(
    tenantId: string,
    params?: { includeDeleted?: boolean },
  ): Promise<Report[]> {
    const admin = createSupabaseAdmin();
    let query = admin
      .from("reports")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (!params?.includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data } = await query;
    return (data ?? []).map((r) => this.toEntity(r as ReportRow));
  }

  async create(params: {
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    reportType: string;
    config?: Record<string, unknown>;
  }): Promise<Report> {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("reports")
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        name: params.name,
        description: params.description ?? null,
        report_type: params.reportType,
        config: params.config ?? {},
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create report: ${error?.message ?? "unknown"}`);
    }

    return this.toEntity(data as ReportRow);
  }

  async update(
    id: string,
    params: {
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
    },
  ): Promise<Report> {
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.config !== undefined) updates.config = params.config;

    const { data, error } = await admin
      .from("reports")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update report: ${error?.message ?? "unknown"}`);
    }

    return this.toEntity(data as ReportRow);
  }

  async softDelete(id: string): Promise<void> {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Failed to delete report: ${error.message}`);
  }

  async countByTenant(tenantId: string): Promise<number> {
    const admin = createSupabaseAdmin();
    const { count } = await admin
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);
    return count ?? 0;
  }

  private toEntity(row: ReportRow): Report {
    return new Report(
      row.id,
      row.tenant_id,
      row.user_id ?? undefined,
      row.name,
      row.description ?? undefined,
      row.report_type,
      row.config,
      row.is_scheduled,
      new Date(row.created_at),
      new Date(row.updated_at),
      row.deleted_at ? new Date(row.deleted_at) : undefined,
    );
  }
}

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Dashboard, DashboardWidget } from "@/domain/entities";
import type { DashboardVisibility } from "@/domain/enums";

export interface DashboardRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  visibility: string;
  layout: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WidgetRow {
  id: string;
  dashboard_id: string;
  widget_type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number } | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export class DashboardService {
  async findById(id: string): Promise<Dashboard | null> {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("dashboards")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return this.toEntity(data as DashboardRow);
  }

  async findByTenant(
    tenantId: string,
    params?: { includeDeleted?: boolean },
  ): Promise<Dashboard[]> {
    const admin = createSupabaseAdmin();
    let query = admin
      .from("dashboards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (!params?.includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data } = await query;
    return (data ?? []).map((r) => this.toEntity(r as DashboardRow));
  }

  async create(params: {
    tenantId: string;
    userId: string;
    name: string;
    description?: string;
    visibility?: DashboardVisibility;
    layout?: Record<string, unknown>;
  }): Promise<Dashboard> {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("dashboards")
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        name: params.name,
        description: params.description ?? null,
        visibility: params.visibility ?? "private",
        layout: params.layout ?? null,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create dashboard: ${error?.message ?? "unknown"}`);
    }

    return this.toEntity(data as DashboardRow);
  }

  async update(
    id: string,
    params: {
      name?: string;
      description?: string;
      visibility?: string;
      layout?: Record<string, unknown>;
    },
  ): Promise<Dashboard> {
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};

    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.visibility !== undefined) updates.visibility = params.visibility;
    if (params.layout !== undefined) updates.layout = params.layout;

    const { data, error } = await admin
      .from("dashboards")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update dashboard: ${error?.message ?? "unknown"}`);
    }

    return this.toEntity(data as DashboardRow);
  }

  async softDelete(id: string): Promise<void> {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("dashboards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    }
  }

  async restore(id: string): Promise<void> {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from("dashboards")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to restore dashboard: ${error.message}`);
    }
  }

  async hardDelete(id: string): Promise<void> {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("dashboards").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to hard delete dashboard: ${error.message}`);
    }
  }

  async countByTenant(tenantId: string): Promise<number> {
    const admin = createSupabaseAdmin();
    const { count } = await admin
      .from("dashboards")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    return count ?? 0;
  }

  async findWidgets(dashboardId: string): Promise<DashboardWidget[]> {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("dashboard_widgets")
      .select("*")
      .eq("dashboard_id", dashboardId)
      .order("sort_order", { ascending: true });

    return (data ?? []).map((r) => this.widgetToEntity(r as WidgetRow));
  }

  async createWidget(params: {
    dashboardId: string;
    widgetType: string;
    title: string;
    config?: Record<string, unknown>;
    position?: { x: number; y: number; w: number; h: number };
    sortOrder?: number;
  }): Promise<DashboardWidget> {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("dashboard_widgets")
      .insert({
        dashboard_id: params.dashboardId,
        widget_type: params.widgetType,
        title: params.title,
        config: params.config ?? {},
        position: params.position ?? null,
        sort_order: params.sortOrder ?? 0,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create widget: ${error?.message ?? "unknown"}`);
    }

    return this.widgetToEntity(data as WidgetRow);
  }

  async updateWidget(
    id: string,
    params: {
      title?: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number; w: number; h: number };
      sortOrder?: number;
      widgetType?: string;
    },
  ): Promise<DashboardWidget> {
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};

    if (params.title !== undefined) updates.title = params.title;
    if (params.config !== undefined) updates.config = params.config;
    if (params.position !== undefined) updates.position = params.position;
    if (params.sortOrder !== undefined) updates.sort_order = params.sortOrder;
    if (params.widgetType !== undefined) updates.widget_type = params.widgetType;

    const { data, error } = await admin
      .from("dashboard_widgets")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update widget: ${error?.message ?? "unknown"}`);
    }

    return this.widgetToEntity(data as WidgetRow);
  }

  async deleteWidget(id: string): Promise<void> {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("dashboard_widgets").delete().eq("id", id);
    if (error) {
      throw new Error(`Failed to delete widget: ${error.message}`);
    }
  }

  async reorderWidgets(
    dashboardId: string,
    widgetIds: string[],
  ): Promise<void> {
    const admin = createSupabaseAdmin();
    const updates = widgetIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const u of updates) {
      await admin
        .from("dashboard_widgets")
        .update({ sort_order: u.sort_order })
        .eq("id", u.id)
        .eq("dashboard_id", dashboardId);
    }
  }

  private toEntity(row: DashboardRow): Dashboard {
    return new Dashboard(
      row.id,
      row.tenant_id,
      row.user_id ?? undefined,
      row.name,
      row.description ?? undefined,
      row.visibility as DashboardVisibility,
      row.layout ?? undefined,
      row.is_default,
      new Date(row.created_at),
      new Date(row.updated_at),
      row.deleted_at ? new Date(row.deleted_at) : undefined,
    );
  }

  private widgetToEntity(row: WidgetRow): DashboardWidget {
    return new DashboardWidget(
      row.id,
      row.dashboard_id,
      row.widget_type,
      row.title,
      row.config,
      row.position ?? undefined,
      row.sort_order,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}

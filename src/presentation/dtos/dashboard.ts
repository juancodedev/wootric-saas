export interface CreateDashboardRequest {
  name: string;
  description?: string;
  visibility?: string;
  layout?: Record<string, unknown>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  visibility?: string;
  layout?: Record<string, unknown>;
}

export interface CreateWidgetRequest {
  widgetType: string;
  title: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number; w: number; h: number };
  sortOrder?: number;
}

export interface UpdateWidgetRequest {
  title?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number; w: number; h: number };
  sortOrder?: number;
  widgetType?: string;
}

export interface DashboardResponse {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  layout: Record<string, unknown> | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  widgetCount?: number;
}

export interface WidgetResponse {
  id: string;
  dashboardId: string;
  widgetType: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number } | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderWidgetsRequest {
  widgetIds: string[];
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  reportType: string;
  config?: Record<string, unknown>;
}

export interface UpdateReportRequest {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export interface ReportResponse {
  id: string;
  name: string;
  description: string | null;
  reportType: string;
  config: Record<string, unknown>;
  isScheduled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InitExportRequest {
  format: "excel" | "pdf";
  filters?: Record<string, unknown>;
}

export interface ExportStatusResponse {
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

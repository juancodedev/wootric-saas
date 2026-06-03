import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── Reports ─────────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(255),
  description: z.string().max(1000).optional(),
  reportType: z.string().trim().min(1, "reportType is required").max(100),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ─── Dashboards ──────────────────────────────────────────────────────────────

export const createDashboardSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(255),
  description: z.string().max(1000).optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
});

// ─── Wootric Local ───────────────────────────────────────────────────────────

export const wootricLocalQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100000).default(25),
});

// ─── Wootric Export ──────────────────────────────────────────────────────────

export const wootricExportSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(["csv", "excel"]).default("csv"),
});

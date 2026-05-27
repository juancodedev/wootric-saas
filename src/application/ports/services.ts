// ─── Feature Flag Service ───────────────────────────────────────────────────

export interface IFeatureFlagService {
  isEnabled(flagKey: string, tenantId?: string): Promise<boolean>;
  getEnabledFlags(tenantId?: string): Promise<string[]>;
  setOverride(flagKey: string, tenantId: string, enabled: boolean): Promise<void>;
  removeOverride(flagKey: string, tenantId: string): Promise<void>;
}

// ─── Excel Generator ────────────────────────────────────────────────────────

export interface IExcelGenerator {
  generateExport(data: Record<string, unknown>[], columns: ExcelColumn[]): Promise<ArrayBuffer>;
  generateHeaders(columns: ExcelColumn[]): string[];
}

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  type?: "string" | "number" | "date" | "boolean";
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

export interface IPdfGenerator {
  generateReport(
    template: string,
    data: Record<string, unknown>,
    options?: PdfOptions,
  ): Promise<ArrayBuffer>;
}

export interface PdfOptions {
  format?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  margin?: { top: number; right: number; bottom: number; left: number };
}

// ─── Auth Provider ──────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  tenantId: string;
  email: string;
  roleIds: string[];
  permissions: string[];
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  session: AuthSession;
  accessToken: string;
  refreshToken: string;
}

export interface IAuthProvider {
  login(request: LoginRequest): Promise<LoginResponse>;
  logout(sessionToken: string): Promise<void>;
  refreshToken(token: string): Promise<LoginResponse>;
  validateSession(token: string): Promise<AuthSession | null>;
  createUser(email: string, password: string, tenantId: string): Promise<{ id: string }>;
  inviteUser(email: string, tenantId: string): Promise<void>;
}

// ─── Storage Provider ───────────────────────────────────────────────────────

export interface IStorageProvider {
  upload(path: string, buffer: ArrayBuffer, contentType: string): Promise<string>;
  download(path: string): Promise<ArrayBuffer | null>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
  list(prefix: string): Promise<string[]>;
}

// ─── Queue Provider ─────────────────────────────────────────────────────────

export interface QueueMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: Date;
}

export interface IQueueProvider {
  publish<T>(queue: string, message: T, options?: QueuePublishOptions): Promise<void>;
  subscribe<T>(queue: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<void>;
}

export interface QueuePublishOptions {
  delaySeconds?: number;
  deduplicationId?: string;
}

// ─── Cache Provider ─────────────────────────────────────────────────────────

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, amount?: number): Promise<number>;
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────

export interface IRateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ─── Email Provider ─────────────────────────────────────────────────────────

export interface IEmailProvider {
  send(options: EmailOptions): Promise<void>;
  sendTemplate(templateKey: string, to: string, data: Record<string, unknown>): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
}

// ─── Audit Logger ───────────────────────────────────────────────────────────

export interface IAuditLogger {
  log(action: string, context: AuditLogContext): Promise<void>;
}

export interface AuditLogContext {
  tenantId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

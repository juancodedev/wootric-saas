import { injectable } from "tsyringe";

function generateId(): string {
  return crypto.randomUUID();
}

export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  roleIds: string[];
  permissions: string[];
  expiresAt: Date;
  createdAt: Date;
}

export interface StoredSession {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  roleIds: string[];
  permissions: string[];
  expiresAt: string;
  createdAt: string;
}

@injectable()
export class SessionService {
  private readonly PREFIX = "session:";

  async create(data: SessionData): Promise<string> {
    const { KV_SESSIONS } = await getBindings();
    const sessionId = generateId();
    const key = `${this.PREFIX}${data.userId}:${sessionId}`;
    const ttl = Math.max(
      1,
      Math.floor((data.expiresAt.getTime() - Date.now()) / 1000),
    );

    const session: StoredSession = {
      id: sessionId,
      userId: data.userId,
      tenantId: data.tenantId,
      email: data.email,
      roleIds: data.roleIds,
      permissions: data.permissions,
      expiresAt: data.expiresAt.toISOString(),
      createdAt: data.createdAt.toISOString(),
    };

    await KV_SESSIONS.put(key, JSON.stringify(session), {
      expirationTtl: ttl,
    });

    return sessionId;
  }

  async findByUserId(userId: string): Promise<StoredSession | null> {
    const { KV_SESSIONS } = await getBindings();
    const prefix = `${this.PREFIX}${userId}:`;
    const keys = await KV_SESSIONS.list({ prefix });

    if (keys.keys.length === 0) return null;

    const lastKey = keys.keys[keys.keys.length - 1]!;

    const value = await KV_SESSIONS.get(lastKey.name);
    return value ? (JSON.parse(value) as StoredSession) : null;
  }

  async findBySessionId(
    userId: string,
    sessionId: string,
  ): Promise<StoredSession | null> {
    const { KV_SESSIONS } = await getBindings();
    const key = `${this.PREFIX}${userId}:${sessionId}`;
    const value = await KV_SESSIONS.get(key);
    return value ? (JSON.parse(value) as StoredSession) : null;
  }

  async remove(userId: string, sessionId: string): Promise<void> {
    const { KV_SESSIONS } = await getBindings();
    const key = `${this.PREFIX}${userId}:${sessionId}`;
    await KV_SESSIONS.delete(key);
  }

  async removeAllForUser(userId: string): Promise<void> {
    const { KV_SESSIONS } = await getBindings();
    const prefix = `${this.PREFIX}${userId}:`;
    const keys = await KV_SESSIONS.list({ prefix });

    if (keys.keys.length > 0) {
      await Promise.all(
        keys.keys.map((k: { name: string }) => KV_SESSIONS.delete(k.name)),
      );
    }
  }
}

// Inline to avoid circular dependency
import { getBindings } from "@/lib/cloudflare/bindings";

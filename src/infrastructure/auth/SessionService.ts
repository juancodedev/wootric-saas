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

export class SessionService {
  private readonly PREFIX = "session:";
  private readonly CURRENT_SUFFIX = ":current";

  async create(data: SessionData): Promise<string> {
    const { KV_SESSIONS } = await getBindings();
    const sessionId = generateId();
    const key = `${this.PREFIX}${data.userId}:${sessionId}`;
    const currentKey = `${this.PREFIX}${data.userId}${this.CURRENT_SUFFIX}`;
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

    const sessionJson = JSON.stringify(session);

    // Write both the session key and the "current" pointer in parallel
    await Promise.all([
      KV_SESSIONS.put(key, sessionJson, { expirationTtl: ttl }),
      KV_SESSIONS.put(currentKey, sessionJson, { expirationTtl: ttl }),
    ]);

    return sessionId;
  }

  /**
   * Single KV.get using the "current" pointer — avoids list+get round trip.
   */
  async findByUserId(userId: string): Promise<StoredSession | null> {
    const { KV_SESSIONS } = await getBindings();
    const currentKey = `${this.PREFIX}${userId}${this.CURRENT_SUFFIX}`;
    const value = await KV_SESSIONS.get(currentKey);
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
    const currentKey = `${this.PREFIX}${userId}${this.CURRENT_SUFFIX}`;

    // Check if the "current" pointer points to this session before deleting it
    const currentValue = await KV_SESSIONS.get(currentKey);
    if (currentValue) {
      const current = JSON.parse(currentValue) as StoredSession;
      if (current.id === sessionId) {
        await KV_SESSIONS.delete(currentKey);
      }
    }

    await KV_SESSIONS.delete(key);
  }

  async removeAllForUser(userId: string): Promise<void> {
    const { KV_SESSIONS } = await getBindings();
    const prefix = `${this.PREFIX}${userId}:`;
    const currentKey = `${this.PREFIX}${userId}${this.CURRENT_SUFFIX}`;

    // Delete the "current" pointer
    await KV_SESSIONS.delete(currentKey);

    // List and delete all session keys
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

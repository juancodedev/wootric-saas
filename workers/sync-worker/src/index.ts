import type { SyncJobMessage, SyncResult, Env } from "./types";
import { createSupabaseClient } from "./supabase";
import { WootricApiClient } from "./wootric-client";

function log(level: string, message: string, ...args: unknown[]): void {
  console.log(JSON.stringify({ level, message, args, timestamp: new Date().toISOString() }));
}

async function runSync(
  supabase: ReturnType<typeof createSupabaseClient>,
  tenantId: string,
  syncType: "full" | "incremental",
  env: Env,
): Promise<SyncResult> {
  const startTime = Date.now();
  let responsesSynced = 0;
  let errors = 0;

  const config = await supabase.getTenantConfig(tenantId);
  const wootricConfig = config.wootric as Record<string, string> | undefined;

  const apiUrl = wootricConfig?.api_url ?? env.WOOTRIC_API_URL;
  const username = wootricConfig?.username ?? env.WOOTRIC_USERNAME;
  const password = wootricConfig?.password ?? env.WOOTRIC_PASSWORD;

  if (!apiUrl || !username || !password) {
    log("warn", `Tenant ${tenantId} has no Wootric API credentials configured, skipping`);
    return { responsesSynced: 0, errors: 0, durationMs: Date.now() - startTime, lastSyncAt: new Date().toISOString() };
  }

  const client = new WootricApiClient({ apiUrl, username, password });

  const lastSyncKey = "wootric_last_sync";
  const lastSyncStr = config[lastSyncKey] as string | undefined;

  const quota = await supabase.getQuota(tenantId, "max_responses_synced");
  const maxResponses = quota?.limit ?? 1000;
  const usedResponses = quota?.used ?? 0;
  const remaining = Math.max(0, maxResponses - usedResponses);

  if (remaining <= 0) {
    log("warn", `Tenant ${tenantId} has reached max responses synced quota (${usedResponses}/${maxResponses})`);
    return { responsesSynced: 0, errors: 0, durationMs: Date.now() - startTime, lastSyncAt: new Date().toISOString() };
  }

  const params: {
    startDate?: string;
    endDate?: string;
    segment?: string;
  } = {};

  if (syncType === "incremental" && lastSyncStr) {
    const lastSyncDate = new Date(lastSyncStr);
    lastSyncDate.setMinutes(lastSyncDate.getMinutes() - 5);
    params.startDate = lastSyncDate.toISOString();
    log("info", `Incremental sync for tenant ${tenantId} since ${params.startDate}`);
  } else {
    log("info", `Full sync for tenant ${tenantId}`);
  }

  try {
    const result = await client.fetchAllResponses({
      ...params,
      onPage: async (_responses) => {
        responsesSynced += _responses.length;
        if (responsesSynced >= remaining) {
          log("warn", `Tenant ${tenantId}: stopping sync at quota limit (${remaining})`);
        }
      },
    });

    responsesSynced = Math.min(result.responses.length, remaining);

    if (result.responses.length > 0) {
      await supabase.upsertConfig(tenantId, lastSyncKey, new Date().toISOString());
      await supabase.updateQuotaUsed(tenantId, "max_responses_synced", usedResponses + responsesSynced);

      log("info", `Tenant ${tenantId}: synced ${responsesSynced} responses, quota ${usedResponses + responsesSynced}/${maxResponses}`);
    } else {
      await supabase.upsertConfig(tenantId, lastSyncKey, new Date().toISOString());
      log("info", `Tenant ${tenantId}: no new responses to sync`);
    }
  } catch (error) {
    errors++;
    const message = error instanceof Error ? error.message : "Unknown error";
    log("error", `Sync failed for tenant ${tenantId}: ${message}`);
    throw error;
  }

  return {
    responsesSynced,
    errors,
    durationMs: Date.now() - startTime,
    lastSyncAt: new Date().toISOString(),
  };
}

async function handleSyncJob(
  msg: SyncJobMessage,
  env: Env,
): Promise<void> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  log("info", `Processing sync job for tenant ${msg.tenantId}, type: ${msg.syncType}`);

  const result = await runSync(supabase, msg.tenantId, msg.syncType, env);

  log("info", `Sync completed for tenant ${msg.tenantId}: ${JSON.stringify(result)}`);
}

async function handleScheduledSync(env: Env): Promise<void> {
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  log("info", "Running scheduled sync for all active tenants");

  const tenants = await supabase.getActiveTenants();
  log("info", `Found ${tenants.length} active tenants to sync`);

  let totalSynced = 0;
  let totalErrors = 0;

  for (const tenant of tenants) {
    try {
      const result = await runSync(supabase, tenant.id, "incremental", env);
      totalSynced += result.responsesSynced;
      totalErrors += result.errors;
    } catch (error) {
      totalErrors++;
      log("error", `Scheduled sync failed for tenant ${tenant.id} (${tenant.slug}): ${error}`);
    }
  }

  log("info", `Scheduled sync complete: ${totalSynced} responses synced, ${totalErrors} errors across ${tenants.length} tenants`);
}

export default {
  async queue(
    batch: MessageBatch<SyncJobMessage>,
    env: Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await handleSyncJob(msg.body, env);
        msg.ack();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log("error", `Sync job failed (attempt ${msg.attempts}): ${message}`);

        if (msg.attempts < 3) {
          msg.retry({ delaySeconds: Math.pow(10, msg.attempts) });
        } else {
          log("error", `Sync job permanently failed after 3 attempts: ${message}`);
          msg.ack();
        }
      }
    }
  },

  // ── Cron handlers ──

  async checkTrialExpirations(env: Env): Promise<void> {
    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    log("info", "Checking trial expirations");

    try {
      const expired = await supabase.findExpiredTrials();
      if (expired.length === 0) {
        log("info", "No expired trials found");
        return;
      }

      const ids = expired.map((s) => s.id);
      await supabase.expireSubscriptions(ids);

      for (const sub of expired) {
        log("info", `Expired trial for tenant ${sub.tenant_id}`);
      }

      log("info", `Expired ${expired.length} trials`);
    } catch (error) {
      log("error", `Trial expiration check failed: ${error}`);
    }
  },

  async resetQuotas(env: Env): Promise<void> {
    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    log("info", "Resetting expired quotas");

    try {
      const expired = await supabase.findExpiredQuotas();
      if (expired.length === 0) {
        log("info", "No expired quotas to reset");
        return;
      }

      const ids = expired.map((q) => q.id);
      await supabase.resetQuotas(ids);

      log("info", `Reset ${expired.length} quotas across ${new Set(expired.map((q) => q.tenant_id)).size} tenants`);
    } catch (error) {
      log("error", `Quota reset failed: ${error}`);
    }
  },

  async cleanupAuditLogs(env: Env): Promise<void> {
    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    log("info", "Cleaning up old audit logs");

    try {
      const retentionDays = 90;
      const deleted = await supabase.deleteOldAuditLogs(retentionDays);
      log("info", `Deleted ${deleted} audit log entries older than ${retentionDays} days`);
    } catch (error) {
      log("error", `Audit log cleanup failed: ${error}`);
    }
  },

  async handleGracePeriod(env: Env): Promise<void> {
    const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    log("info", "Checking grace period for past-due subscriptions");

    try {
      const pastDue = await supabase.findPastDueSubscriptions();
      if (pastDue.length === 0) {
        log("info", "No past-due subscriptions found");
        return;
      }

      const now = Date.now();
      const DAY_MS = 86400000;

      for (const sub of pastDue) {
        const updatedAt = new Date(sub.updated_at).getTime();
        const daysPastDue = Math.floor((now - updatedAt) / DAY_MS);

        if (daysPastDue >= 7) {
          await supabase.expireSubscriptions([sub.id]);
          await supabase.updateTenantStatus(sub.tenant_id, "suspended");
          log("info", `Suspended tenant ${sub.tenant_id} after ${daysPastDue} days past due`);
        } else if (daysPastDue >= 3) {
          await supabase.upsertConfig(sub.tenant_id, "access_level", "read_only");
          log("info", `Degraded tenant ${sub.tenant_id} to read-only (${daysPastDue} days past due)`);
        } else {
          log("info", `Tenant ${sub.tenant_id} is ${daysPastDue} days past due — warning pending`);
        }
      }

      log("info", `Processed ${pastDue.length} past-due subscriptions`);
    } catch (error) {
      log("error", `Grace period check failed: ${error}`);
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const cron = controller.cron;

    log("info", `Scheduled trigger fired: ${cron}`);

    try {
      switch (cron) {
        case "*/30 * * * *":
          await handleScheduledSync(env);
          break;

        case "0 0 * * *":
          await this.checkTrialExpirations(env);
          await this.handleGracePeriod(env);
          break;

        case "0 1 * * *":
          await this.resetQuotas(env);
          break;

        case "0 3 * * 0":
          await this.cleanupAuditLogs(env);
          break;

        default:
          log("warn", `Unknown cron schedule: ${cron}`);
      }
    } catch (error) {
      log("error", `Scheduled task failed for cron ${cron}: ${error}`);
    }
  },
};

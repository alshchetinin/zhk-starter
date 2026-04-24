import { db } from "@zhk/db";
import { integrations } from "@zhk/db/schema";
import { and, eq, isNotNull, lte, or, isNull, sql } from "drizzle-orm";
import { runIntegrationSync } from "@zhk/api/services/sync";

const TICK_INTERVAL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_CONCURRENT_SYNCS = 3;

let timer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;
let runningCount = 0;

export function startScheduler() {
  if (timer) return;
  console.log("[scheduler] started (tick every 60s, cleanup every 1h)");
  timer = setInterval(() => {
    void tick().catch((err) => console.error("[scheduler] tick error:", err));
  }, TICK_INTERVAL_MS);
  cleanupTimer = setInterval(() => {
    void cleanupOldLogs().catch((err) =>
      console.error("[scheduler] cleanup error:", err),
    );
  }, CLEANUP_INTERVAL_MS);
  void tick();
  void cleanupOldLogs();
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

const CLEANUP_BATCH_SIZE = 5000;

async function cleanupOldLogs() {
  let totalDeleted = 0;
  for (;;) {
    const result = await db.execute(sql`
      DELETE FROM sync_logs
      WHERE id IN (
        SELECT sl.id
        FROM sync_logs sl
        JOIN integrations i ON i.id = sl.integration_id
        WHERE sl.started_at < NOW() - (i.logs_retention_days || ' days')::interval
        LIMIT ${CLEANUP_BATCH_SIZE}
      )
    `);
    const deleted = (result as { rowCount?: number }).rowCount ?? 0;
    totalDeleted += deleted;
    if (deleted < CLEANUP_BATCH_SIZE) break;
  }
  if (totalDeleted > 0) {
    console.log(`[scheduler] cleanup: removed ${totalDeleted} old sync logs`);
  }
}

async function tick() {
  const now = new Date();

  const candidates = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.isActive, true),
        eq(integrations.autoSyncEnabled, true),
        or(
          isNull(integrations.pausedUntil),
          lte(integrations.pausedUntil, now),
        ),
        or(
          isNull(integrations.nextSyncAt),
          lte(integrations.nextSyncAt, now),
        ),
        isNotNull(integrations.type),
      ),
    );

  for (const integration of candidates) {
    if (runningCount >= MAX_CONCURRENT_SYNCS) break;
    if (integration.status === "loading") continue;
    if (!isInsideWindow(integration, now)) continue;

    console.log(`[scheduler] running sync for ${integration.id}`);
    runningCount++;
    void runIntegrationSync(integration, { trigger: "scheduled" })
      .catch((err) =>
        console.error(`[scheduler] sync ${integration.id} failed:`, err),
      )
      .finally(() => {
        runningCount--;
      });
  }
}

function isInsideWindow(
  integration: typeof integrations.$inferSelect,
  now: Date,
): boolean {
  const start = integration.syncWindowStart;
  const end = integration.syncWindowEnd;
  if (start == null || end == null) return true;
  const hour = now.getHours();
  if (start <= end) {
    return hour >= start && hour < end;
  }
  // wraps midnight, e.g. 22..6
  return hour >= start || hour < end;
}

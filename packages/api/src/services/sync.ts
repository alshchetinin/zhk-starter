import { db } from "@zhk/db";
import { integrations, syncLogs } from "@zhk/db/schema";
import type { SyncLogStats, SyncLogTrigger } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "../utils/encryption";
import { sendTelegramMessage } from "./notify";

type Integration = typeof integrations.$inferSelect;

interface RunOptions {
  trigger: SyncLogTrigger;
  complexes?: number[];
  attempt?: number;
}

export async function runIntegrationSync(
  integration: Integration,
  opts: RunOptions,
) {
  const attempt = opts.attempt ?? 1;
  const startedAt = new Date();

  const [log] = await db
    .insert(syncLogs)
    .values({
      integrationId: integration.id,
      trigger: opts.trigger,
      status: "running",
      startedAt,
    })
    .returning();

  await db
    .update(integrations)
    .set({ status: "loading", cancelRequested: false })
    .where(eq(integrations.id, integration.id));

  try {
    const stats = await runByType(integration, opts.complexes ?? []);

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const wasCancelled = await checkCancelled(integration.id);

    await db
      .update(syncLogs)
      .set({
        status: wasCancelled ? "cancelled" : "success",
        finishedAt,
        durationMs,
        stats,
      })
      .where(eq(syncLogs.id, log.id));

    const nextSyncAt = integration.autoSyncEnabled
      ? new Date(Date.now() + integration.syncIntervalMinutes * 60_000)
      : null;

    await db
      .update(integrations)
      .set({
        status: wasCancelled ? "failed" : "success",
        lastSyncAt: finishedAt,
        lastSyncDurationMs: durationMs,
        nextSyncAt,
        cancelRequested: false,
      })
      .where(eq(integrations.id, integration.id));

    console.log(
      `[sync] ${integration.id} ${wasCancelled ? "cancelled" : "success"} in ${durationMs}ms (attempt ${attempt})`,
    );

    if (integration.notifyLevel === "all") {
      const title = wasCancelled ? "Синхронизация отменена" : "Синхронизация завершена";
      const icon = wasCancelled ? "⏹" : "✅";
      const statsLine = formatStats(stats);
      notify(
        integration,
        `${icon} <b>${title}</b>\nИнтеграция: <code>${integration.domain ?? integration.id}</code>\nТриггер: ${opts.trigger}\nДлительность: ${formatDuration(durationMs)}${statsLine ? `\n\n${statsLine}` : ""}`,
      );
    }
  } catch (err) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const error = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack ?? null : null;

    await db
      .update(syncLogs)
      .set({
        status: "failed",
        finishedAt,
        durationMs,
        error,
        errorStack,
      })
      .where(eq(syncLogs.id, log.id));

    const shouldRetry = attempt < integration.retryAttempts;
    const nextSyncAt = shouldRetry
      ? new Date(Date.now() + integration.retryDelayMinutes * 60_000)
      : integration.autoSyncEnabled
        ? new Date(Date.now() + integration.syncIntervalMinutes * 60_000)
        : null;

    await db
      .update(integrations)
      .set({
        status: "failed",
        lastSyncAt: finishedAt,
        lastSyncDurationMs: durationMs,
        nextSyncAt,
      })
      .where(eq(integrations.id, integration.id));

    console.error(
      `[sync] ${integration.id} failed (attempt ${attempt}/${integration.retryAttempts}): ${error}`,
    );

    const shouldNotify =
      integration.notifyLevel === "all" ||
      (integration.notifyLevel === "errors" && !shouldRetry);

    if (shouldNotify) {
      const title = shouldRetry
        ? "Ошибка, запланирован повтор"
        : "Ошибка синхронизации";
      notify(
        integration,
        `❌ <b>${title}</b>\nИнтеграция: <code>${integration.domain ?? integration.id}</code>\nТриггер: ${opts.trigger}\nПопытка: ${attempt}/${integration.retryAttempts}\n\n<pre>${escapeHtml(error)}</pre>`,
      );
    }
  }
}

function notify(integration: Integration, text: string) {
  if (
    !integration.notifyTelegramBotToken ||
    !integration.notifyTelegramChatId
  ) {
    return;
  }
  void sendTelegramMessage(
    integration.notifyTelegramBotToken,
    integration.notifyTelegramChatId,
    text,
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s} с`;
  return `${Math.floor(s / 60)} мин ${Math.round(s % 60)} с`;
}

function formatStats(stats: SyncLogStats): string {
  const parts: string[] = [];
  if (stats.projects != null) parts.push(`Проектов: ${stats.projects}`);
  if (stats.units != null) parts.push(`Объектов: ${stats.units}`);
  if (stats.created != null) parts.push(`Создано: ${stats.created}`);
  if (stats.updated != null) parts.push(`Обновлено: ${stats.updated}`);
  return parts.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function checkCancelled(integrationId: string): Promise<boolean> {
  const row = await db.query.integrations.findFirst({
    where: eq(integrations.id, integrationId),
    columns: { cancelRequested: true },
  });
  return row?.cancelRequested ?? false;
}

async function runByType(
  integration: Integration,
  complexes: number[],
): Promise<SyncLogStats> {
  const provider = process.env.INTEGRATION_PROVIDER ?? "macro";
  if (integration.type && integration.type !== provider) {
    throw new Error(
      `Integration type (${integration.type}) doesn't match INTEGRATION_PROVIDER (${provider}). Reconfigure or delete the integration.`,
    );
  }

  if (provider === "macro") {
    return runMacro(integration, complexes);
  }
  if (provider === "profitbase") {
    return runProfitbase(integration, complexes);
  }
  throw new Error(`Unsupported integration provider: ${provider}`);
}

async function runProfitbase(
  integration: Integration,
  projectIds: number[],
): Promise<SyncLogStats> {
  const { getProfitbaseData } = await import("@zhk/profitbase");
  const { importAllData } = await import("@zhk/import");

  if (!integration.profitbaseApiKey || !integration.profitbaseAccountId) {
    throw new Error("Profitbase integration is not configured");
  }

  const apiKey = decrypt(integration.profitbaseApiKey);
  const importData = await getProfitbaseData(
    {
      id: integration.id,
      siteId: integration.siteId,
      apiKey,
      accountId: integration.profitbaseAccountId,
    },
    projectIds,
  );

  const result = await importAllData(
    importData,
    integration.id,
    integration.siteId,
  );

  if (!result.success) {
    throw new Error(result.error ?? "Import failed");
  }

  let created = 0;
  let updated = 0;
  let projectsCount = 0;
  let unitsCount = 0;
  for (const r of result.results) {
    created += r.inserted;
    updated += r.updated;
    if (r.table === "projects") projectsCount = r.inserted + r.updated;
    if (r.table === "apartments") unitsCount += r.inserted + r.updated;
  }

  return { projects: projectsCount, units: unitsCount, created, updated };
}

async function runMacro(
  integration: Integration,
  complexes: number[],
): Promise<SyncLogStats> {
  const { getMacroData } = await import("@zhk/macro");
  const { importAllData } = await import("@zhk/import");

  if (!integration.domain || !integration.appSecret) {
    throw new Error("Macro integration is not configured");
  }

  const appSecret = decrypt(integration.appSecret);

  const macroConfig = {
    id: integration.id,
    siteId: integration.siteId,
    domain: integration.domain,
    appSecret,
    apiDomain: integration.apiDomain ?? "api.macroserver.ru",
  };

  const importData = await getMacroData(macroConfig, complexes);
  const result = await importAllData(
    importData,
    integration.id,
    integration.siteId,
  );

  if (!result.success) {
    throw new Error(result.error ?? "Import failed");
  }

  let created = 0;
  let updated = 0;
  let projectsCount = 0;
  let unitsCount = 0;
  for (const r of result.results) {
    created += r.inserted;
    updated += r.updated;
    if (r.table === "projects") projectsCount = r.inserted + r.updated;
    if (r.table === "apartments" || r.table === "commerce_units") {
      unitsCount += r.inserted + r.updated;
    }
  }

  return {
    projects: projectsCount,
    units: unitsCount,
    created,
    updated,
  };
}

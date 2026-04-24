import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@zhk/db";
import { integrations, sites, projects, syncLogs } from "@zhk/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { encrypt, decrypt } from "../utils/encryption";
import { runIntegrationSync } from "../services/sync";
import { sendTelegramMessage } from "../services/notify";

export const integrationRouter = {
  getActiveProvider: protectedProcedure.handler(() => {
    return {
      provider: (process.env.INTEGRATION_PROVIDER ?? "macro") as
        | "macro"
        | "profitbase",
    };
  }),

  get: protectedProcedure.handler(async () => {
    const integration = await db.query.integrations.findFirst();
    if (!integration) return null;

    return {
      ...integration,
      appSecret: integration.appSecret ? "••••••••" : null,
    };
  }),

  setup: protectedProcedure
    .input(
      z.object({
        domain: z.string().min(1),
        appSecret: z.string().min(1),
        apiDomain: z.string().default("api.macroserver.ru"),
        macroType: z.enum(["living", "comm"]).default("living"),
      }),
    )
    .handler(async ({ input }) => {
      // Ensure default tenant exists
      const tenant = await db.query.sites.findFirst({
        where: eq(sites.id, "default"),
      });
      if (!tenant) {
        await db.insert(sites).values({
          id: "default",
          name: "Default",
          slug: "default",
        });
      }

      const encryptedSecret = encrypt(input.appSecret);
      const existing = await db.query.integrations.findFirst();

      if (existing) {
        if (existing.type && existing.type !== "macro") {
          throw new ORPCError("CONFLICT", {
            message: `Интеграция другого типа (${existing.type}) уже настроена. Удалите её перед подключением MacroCRM.`,
          });
        }
        const [updated] = await db
          .update(integrations)
          .set({
            type: "macro",
            domain: input.domain,
            apiDomain: input.apiDomain,
            appSecret: encryptedSecret,
            macroType: input.macroType,
            isActive: true,
          })
          .where(eq(integrations.id, existing.id))
          .returning();
        return { ...updated, appSecret: "••••••••" };
      }

      const [created] = await db
        .insert(integrations)
        .values({
          type: "macro",
          domain: input.domain,
          apiDomain: input.apiDomain,
          appSecret: encryptedSecret,
          macroType: input.macroType,
          isActive: true,
        })
        .returning();

      return { ...created, appSecret: "••••••••" };
    }),

  verifyConnection: protectedProcedure.handler(async () => {
    const integration = await db.query.integrations.findFirst();

    if (!integration?.domain || !integration.appSecret) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Integration not configured",
      });
    }

    const appSecret = decrypt(integration.appSecret);
    const { getMacroComplexes } = await import("@zhk/macro");

    const complexes = await getMacroComplexes(
      integration.domain,
      appSecret,
      integration.apiDomain ?? "api.macroserver.ru",
    );

    await db
      .update(integrations)
      .set({ lastVerifiedAt: new Date() })
      .where(eq(integrations.id, integration.id));

    return { ok: true, complexCount: complexes.length };
  }),

  getComplexes: protectedProcedure.handler(async () => {
    const integration = await db.query.integrations.findFirst();

    if (!integration?.domain || !integration.appSecret) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Integration not configured",
      });
    }

    const appSecret = decrypt(integration.appSecret);
    const { getMacroComplexes } = await import("@zhk/macro");

    const [complexes, existingProjects] = await Promise.all([
      getMacroComplexes(
        integration.domain,
        appSecret,
        integration.apiDomain ?? "api.macroserver.ru",
      ),
      db.query.projects.findMany({
        where: eq(projects.integrationId, integration.id),
        columns: { macroComplexId: true },
      }),
    ]);

    return {
      complexes,
      integrationId: integration.id,
      existingComplexIds: existingProjects
        .map((p) => p.macroComplexId)
        .filter((id): id is number => id != null),
    };
  }),

  remove: protectedProcedure.handler(async () => {
    const integration = await db.query.integrations.findFirst();

    if (!integration) {
      throw new ORPCError("NOT_FOUND", { message: "No integration found" });
    }

    await db
      .delete(integrations)
      .where(eq(integrations.id, integration.id));

    return { success: true };
  }),

  triggerSync: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        complexes: z.array(z.number()).default([]),
      }),
    )
    .handler(async ({ input }) => {
      const integration = await db.query.integrations.findFirst({
        where: eq(integrations.id, input.integrationId),
      });

      if (!integration) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }

      if (integration.status === "loading") {
        throw new ORPCError("CONFLICT", {
          message: "Sync already in progress",
        });
      }

      runIntegrationSync(integration, {
        trigger: "manual",
        complexes: input.complexes,
      }).catch((err) => {
        console.error("[sync] Unhandled error:", err);
      });

      return { status: "loading" as const, integrationId: input.integrationId };
    }),

  updateSyncSettings: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        autoSyncEnabled: z.boolean().optional(),
        syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
        pausedUntil: z.date().nullable().optional(),
        syncWindowStart: z.number().int().min(0).max(23).nullable().optional(),
        syncWindowEnd: z.number().int().min(0).max(23).nullable().optional(),
        retryAttempts: z.number().int().min(0).max(10).optional(),
        retryDelayMinutes: z.number().int().min(1).max(1440).optional(),
        logsRetentionDays: z.number().int().min(1).max(365).optional(),
        notifyLevel: z.enum(["none", "errors", "all"]).optional(),
        notifyTelegramBotToken: z.string().nullable().optional(),
        notifyTelegramChatId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { integrationId, ...patch } = input;
      const existing = await db.query.integrations.findFirst({
        where: eq(integrations.id, integrationId),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }

      const update: Partial<typeof integrations.$inferInsert> = { ...patch };

      if (patch.autoSyncEnabled === true && !existing.nextSyncAt) {
        update.nextSyncAt = new Date();
      }
      if (patch.autoSyncEnabled === false) {
        update.nextSyncAt = null;
      }

      const [updated] = await db
        .update(integrations)
        .set(update)
        .where(eq(integrations.id, integrationId))
        .returning();

      return { ...updated, appSecret: updated.appSecret ? "••••••••" : null };
    }),

  pauseSync: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        until: z.date().nullable(),
      }),
    )
    .handler(async ({ input }) => {
      await db
        .update(integrations)
        .set({ pausedUntil: input.until })
        .where(eq(integrations.id, input.integrationId));
      return { ok: true };
    }),

  testNotification: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .handler(async ({ input }) => {
      const integration = await db.query.integrations.findFirst({
        where: eq(integrations.id, input.integrationId),
      });
      if (!integration) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }
      if (
        !integration.notifyTelegramBotToken ||
        !integration.notifyTelegramChatId
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Telegram not configured",
        });
      }
      const result = await sendTelegramMessage(
        integration.notifyTelegramBotToken,
        integration.notifyTelegramChatId,
        `✅ Тестовое уведомление\nИнтеграция: ${integration.domain ?? integration.id}`,
      );
      if (!result.ok) {
        throw new ORPCError("BAD_REQUEST", {
          message: result.error ?? "Failed to send",
        });
      }
      return { ok: true };
    }),

  cancelRunningSync: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .handler(async ({ input }) => {
      await db
        .update(integrations)
        .set({ cancelRequested: true })
        .where(eq(integrations.id, input.integrationId));
      return { ok: true };
    }),

  listLogs: protectedProcedure
    .input(
      z.object({
        integrationId: z.string().optional(),
        status: z
          .enum(["running", "success", "failed", "cancelled"])
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .handler(async ({ input }) => {
      const conditions = [];
      if (input.integrationId)
        conditions.push(eq(syncLogs.integrationId, input.integrationId));
      if (input.status) conditions.push(eq(syncLogs.status, input.status));

      const where = conditions.length ? and(...conditions) : undefined;

      const [items, countRow] = await Promise.all([
        db.query.syncLogs.findMany({
          where,
          orderBy: (t, { desc }) => [desc(t.startedAt)],
          limit: input.limit,
          offset: input.offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(syncLogs)
          .where(where),
      ]);

      return { items, total: countRow[0]?.count ?? 0 };
    }),

  getLogById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const log = await db.query.syncLogs.findFirst({
        where: eq(syncLogs.id, input.id),
      });
      if (!log) {
        throw new ORPCError("NOT_FOUND", { message: "Log not found" });
      }
      return log;
    }),
};

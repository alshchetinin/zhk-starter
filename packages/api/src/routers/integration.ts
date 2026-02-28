import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@zhk/db";
import { integrations, tenants } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { encrypt, decrypt } from "../utils/encryption";

export const integrationRouter = {
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
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, "default"),
      });
      if (!tenant) {
        await db.insert(tenants).values({
          id: "default",
          name: "Default",
          slug: "default",
        });
      }

      const encryptedSecret = encrypt(input.appSecret);
      const existing = await db.query.integrations.findFirst();

      if (existing) {
        const [updated] = await db
          .update(integrations)
          .set({
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

    const complexes = await getMacroComplexes(
      integration.domain,
      appSecret,
      integration.apiDomain ?? "api.macroserver.ru",
    );

    return { complexes, integrationId: integration.id };
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

      await db
        .update(integrations)
        .set({ status: "loading" })
        .where(eq(integrations.id, input.integrationId));

      runMacroSync(integration, input.complexes).catch(async (err) => {
        console.error("[sync] Failed:", err);
        await db
          .update(integrations)
          .set({ status: "failed" })
          .where(eq(integrations.id, input.integrationId));
      });

      return { status: "loading" as const, integrationId: input.integrationId };
    }),
};

async function runMacroSync(
  integration: typeof integrations.$inferSelect,
  complexes: number[],
) {
  const { getMacroData } = await import("@zhk/macro");
  const { importAllData } = await import("@zhk/import");

  const appSecret = integration.appSecret
    ? decrypt(integration.appSecret)
    : integration.appSecret!;

  const macroConfig = {
    id: integration.id,
    tenantId: integration.tenantId,
    domain: integration.domain!,
    appSecret,
    apiDomain: integration.apiDomain ?? "api.macroserver.ru",
  };

  console.log(`[sync] Starting sync for integration ${integration.id}...`);

  const importData = await getMacroData(macroConfig, complexes);
  const result = await importAllData(
    importData,
    integration.id,
    integration.tenantId,
  );

  if (result.success) {
    await db
      .update(integrations)
      .set({ status: "success" })
      .where(eq(integrations.id, integration.id));
    console.log(`[sync] Integration ${integration.id} completed successfully`);
  } else {
    await db
      .update(integrations)
      .set({ status: "failed" })
      .where(eq(integrations.id, integration.id));
    console.error(`[sync] Integration ${integration.id} failed: ${result.error}`);
  }
}

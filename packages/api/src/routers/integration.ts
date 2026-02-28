import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { db } from "@zhk/db";
import { integrations } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

export const integrationRouter = {
  list: protectedProcedure.handler(async () => {
    return db.query.integrations.findMany();
  }),

  getStatus: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .handler(async ({ input }) => {
      const integration = await db.query.integrations.findFirst({
        where: eq(integrations.id, input.integrationId),
      });
      if (!integration) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }
      return integration;
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

      // Set status to loading
      await db
        .update(integrations)
        .set({ status: "loading" })
        .where(eq(integrations.id, input.integrationId));

      // Fire and forget — run sync asynchronously
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

  const macroConfig = {
    id: integration.id,
    tenantId: integration.tenantId,
    domain: integration.domain!,
    appSecret: integration.appSecret!,
    apiDomain: integration.apiDomain!,
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

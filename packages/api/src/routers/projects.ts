import { z } from "zod";
import { db } from "@zhk/db";
import { integrations, projects } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { decrypt } from "../utils/encryption";

export const projectsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["active", "completed", "planning", "hidden"]).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [];
      if (status) conditions.push(eq(projects.status, status));
      if (search) conditions.push(ilike(projects.name, `%${search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.projects.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { city: true },
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(projects).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
        with: { city: true, buildings: true },
      });
      if (!project) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        integrationId: z.string(),
        complexId: z.number(),
        complexName: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const integration = await db.query.integrations.findFirst({
        where: eq(integrations.id, input.integrationId),
      });
      if (!integration) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }

      const [created] = await db
        .insert(projects)
        .values({
          name: input.name,
          integrationId: input.integrationId,
          externalId: input.complexId.toString(),
          macroComplexId: input.complexId,
          macroComplexName: input.complexName ?? null,
          status: "active",
          address: "",
        })
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        status: z.enum(["active", "completed", "planning", "hidden"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }

      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.status) updates.status = input.status;

      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }

      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),

  sync: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
        with: { integration: true },
      });

      if (!project) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      if (!project.integration) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No integration linked to this project",
        });
      }
      if (!project.macroComplexId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No MacroCRM complex linked to this project",
        });
      }
      if (project.lastSyncStatus === "loading") {
        throw new ORPCError("CONFLICT", {
          message: "Sync already in progress",
        });
      }

      await db
        .update(projects)
        .set({ lastSyncStatus: "loading" })
        .where(eq(projects.id, input.id));

      runProjectSync(project, project.integration).catch(async (err) => {
        console.error(`[sync] Project ${input.id} failed:`, err);
        await db
          .update(projects)
          .set({
            lastSyncStatus: "error",
            lastSyncError: err instanceof Error ? err.message : String(err),
          })
          .where(eq(projects.id, input.id));
      });

      return { status: "loading" as const, projectId: input.id };
    }),
};

async function runProjectSync(
  project: typeof projects.$inferSelect,
  integration: typeof integrations.$inferSelect,
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

  console.log(
    `[sync] Starting sync for project ${project.id} (complex ${project.macroComplexId})...`,
  );

  const importData = await getMacroData(macroConfig, [project.macroComplexId!]);
  const result = await importAllData(
    importData,
    integration.id,
    integration.tenantId,
  );

  if (result.success) {
    await db
      .update(projects)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
      })
      .where(eq(projects.id, project.id));
    console.log(`[sync] Project ${project.id} completed successfully`);
  } else {
    await db
      .update(projects)
      .set({
        lastSyncStatus: "error",
        lastSyncError: result.error ?? "Unknown error",
      })
      .where(eq(projects.id, project.id));
    console.error(`[sync] Project ${project.id} failed: ${result.error}`);
  }
}

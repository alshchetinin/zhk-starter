import { z } from "zod";
import { db } from "@zhk/db";
import { integrations, projects } from "@zhk/db/schema";
import { and, count, eq, ilike, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
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

  createBatch: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        complexes: z
          .array(
            z.object({
              complexId: z.number(),
              complexName: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .handler(async ({ input }) => {
      const complexIds = input.complexes.map((c) => c.complexId);

      const [integration, existing] = await Promise.all([
        db.query.integrations.findFirst({
          where: eq(integrations.id, input.integrationId),
        }),
        db.query.projects.findMany({
          where: and(
            eq(projects.integrationId, input.integrationId),
            inArray(projects.macroComplexId, complexIds),
          ),
          columns: { macroComplexId: true },
        }),
      ]);

      if (!integration) {
        throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
      }
      const existingIds = new Set(existing.map((p) => p.macroComplexId));
      const newComplexes = input.complexes.filter(
        (c) => !existingIds.has(c.complexId),
      );

      if (newComplexes.length === 0) {
        return [];
      }

      const created = await db
        .insert(projects)
        .values(
          newComplexes.map((c) => ({
            name: c.complexName,
            integrationId: input.integrationId,
            externalId: c.complexId.toString(),
            macroComplexId: c.complexId,
            macroComplexName: c.complexName,
            status: "active" as const,
            address: "",
          })),
        )
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        type: z.string().nullable().optional(),
        status: z.enum(["active", "completed", "planning", "hidden"]).optional(),
        cityId: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        coordinates: z.string().nullable().optional(),
        gallery: z.array(z.string().url()).nullable().optional(),
        cameraUrl: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }

      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return existing;
      }

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

  syncAll: protectedProcedure.handler(async () => {
    const syncable = await db.query.projects.findMany({
      where: and(
        eq(projects.status, "active"),
        isNotNull(projects.macroComplexId),
        isNotNull(projects.integrationId),
        or(isNull(projects.lastSyncStatus), ne(projects.lastSyncStatus, "loading")),
      ),
      with: { integration: true },
    });

    if (syncable.length === 0) {
      return { started: 0 };
    }

    const projectIds = syncable.map((p) => p.id);

    // Mark all as loading
    await db
      .update(projects)
      .set({ lastSyncStatus: "loading" })
      .where(inArray(projects.id, projectIds));

    // Group by integration and run batch sync per integration
    const byIntegration = new Map<string, typeof syncable>();
    for (const p of syncable) {
      const key = p.integration!.id;
      const group = byIntegration.get(key);
      if (group) group.push(p);
      else byIntegration.set(key, [p]);
    }

    for (const [, group] of byIntegration) {
      const integration = group[0]!.integration!;
      const complexIds = group.map((p) => p.macroComplexId!);
      const pIds = group.map((p) => p.id);

      runBatchSync(integration, complexIds, pIds).catch(async (err) => {
        console.error("[syncAll] Failed:", err);
        await db
          .update(projects)
          .set({
            lastSyncStatus: "error",
            lastSyncError: err instanceof Error ? err.message : String(err),
          })
          .where(inArray(projects.id, pIds));
      });
    }

    return { started: syncable.length };
  }),

  recalculateStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!project) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }

      const { recalculateProjectStatistics } = await import(
        "@zhk/db/queries/statistics"
      );
      await recalculateProjectStatistics(input.id);

      return db.query.projects.findFirst({
        where: eq(projects.id, input.id),
        with: { city: true, buildings: true },
      });
    }),
};

async function runBatchSync(
  integration: typeof integrations.$inferSelect,
  complexIds: number[],
  projectIds: string[],
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
    `[syncAll] Starting batch sync for ${complexIds.length} complexes: ${complexIds.join(", ")}`,
  );

  const importData = await getMacroData(macroConfig, complexIds);
  const result = await importAllData(
    importData,
    integration.id,
    integration.tenantId,
  );

  if (result.success) {
    // Recalculate stats for all projects in parallel
    const { recalculateProjectStatistics } = await import(
      "@zhk/db/queries/statistics"
    );
    await Promise.all(
      projectIds.map((projectId) =>
        recalculateProjectStatistics(projectId).catch((err) =>
          console.error(
            `[syncAll] Statistics recalculation failed for ${projectId}:`,
            err,
          ),
        ),
      ),
    );

    await db
      .update(projects)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
      })
      .where(inArray(projects.id, projectIds));
    console.log(`[syncAll] Batch sync completed successfully`);
  } else {
    await db
      .update(projects)
      .set({
        lastSyncStatus: "error",
        lastSyncError: result.error ?? "Unknown error",
      })
      .where(inArray(projects.id, projectIds));
    console.error(`[syncAll] Batch sync failed: ${result.error}`);
  }
}

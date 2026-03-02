import { z } from "zod";
import { db } from "@zhk/db";
import {
  constructionProgress,
  constructionProgressStatusEnum,
} from "@zhk/db/schema";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";

export const constructionProgressRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        projectId: z.string(),
        buildingId: z.string().optional(),
        status: z
          .enum(constructionProgressStatusEnum.enumValues)
          .optional(),
        year: z.number().int().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, projectId, buildingId, status, year } = input;
      const conditions = [eq(constructionProgress.projectId, projectId)];
      if (buildingId) conditions.push(eq(constructionProgress.buildingId, buildingId));
      if (status) conditions.push(eq(constructionProgress.status, status));
      if (year) {
        conditions.push(gte(constructionProgress.date, `${year}-01-01`));
        conditions.push(lt(constructionProgress.date, `${year + 1}-01-01`));
      }
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.constructionProgress.findMany({
          where,
          columns: { contentBlocks: false },
          with: { building: { columns: { id: true, name: true } } },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (cp, { desc }) => [desc(cp.date)],
        }),
        db
          .select({ total: count() })
          .from(constructionProgress)
          .where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.constructionProgress.findFirst({
        where: eq(constructionProgress.id, input.id),
        with: { building: { columns: { id: true, name: true } } },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Construction progress not found",
        });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        buildingId: z.string().nullable().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).transform((v) => v.length === 7 ? `${v}-01` : v),
        gallery: z.array(z.string().url()).min(1),
        contentBlocks: contentBlocksSchema.default([]),
        status: z
          .enum(constructionProgressStatusEnum.enumValues)
          .default("draft"),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(constructionProgress)
        .values({
          projectId: input.projectId,
          buildingId: input.buildingId ?? null,
          title: input.title,
          description: input.description ?? null,
          date: input.date,
          gallery: input.gallery,
          contentBlocks: input.contentBlocks,
          status: input.status,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        buildingId: z.string().nullable().optional(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).transform((v) => v.length === 7 ? `${v}-01` : v).optional(),
        gallery: z.array(z.string().url()).optional(),
        contentBlocks: contentBlocksSchema.optional(),
        status: z
          .enum(constructionProgressStatusEnum.enumValues)
          .optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.constructionProgress.findFirst({
          where: eq(constructionProgress.id, id),
        });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", {
            message: "Construction progress not found",
          });
        }
        return existing;
      }

      const [updated] = await db
        .update(constructionProgress)
        .set(updates)
        .where(eq(constructionProgress.id, id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Construction progress not found",
        });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(constructionProgress)
        .where(eq(constructionProgress.id, input.id))
        .returning({ id: constructionProgress.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", {
          message: "Construction progress not found",
        });
      }
      return { success: true };
    }),
};

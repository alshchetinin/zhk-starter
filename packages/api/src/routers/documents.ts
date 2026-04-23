import { z } from "zod";
import { db } from "@zhk/db";
import { documents, documentStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";

export const documentsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        status: z.enum(documentStatusEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [eq(documents.siteId, context.siteId)];
      if (status) conditions.push(eq(documents.status, status));
      if (search) conditions.push(ilike(documents.title, `%${search}%`));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.documents.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (d, { asc }) => [asc(d.sortOrder)],
        }),
        db.select({ total: count() }).from(documents).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.documents.findFirst({
        where: and(eq(documents.id, input.id), eq(documents.siteId, context.siteId)),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        status: z.enum(documentStatusEnum.enumValues).default("draft"),
        sortOrder: z.number().int().default(0),
        contentBlocks: contentBlocksSchema.default([]),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(documents)
        .values({
          siteId: context.siteId,
          title: input.title,
          slug: input.slug,
          status: input.status,
          sortOrder: input.sortOrder,
          contentBlocks: input.contentBlocks,
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
        })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        status: z.enum(documentStatusEnum.enumValues).optional(),
        sortOrder: z.number().int().optional(),
        contentBlocks: contentBlocksSchema.optional(),
        metaTitle: z.string().nullable().optional(),
        metaDescription: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      const scope = and(eq(documents.id, id), eq(documents.siteId, context.siteId));

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.documents.findFirst({ where: scope });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "Document not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(documents)
        .set(updates)
        .where(scope)
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(documents)
        .where(and(eq(documents.id, input.id), eq(documents.siteId, context.siteId)))
        .returning({ id: documents.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }
      return { success: true };
    }),
};

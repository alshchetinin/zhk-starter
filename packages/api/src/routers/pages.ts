import { z } from "zod";
import { db } from "@zhk/db";
import { pages, pageStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";

export const pagesRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        status: z.enum(pageStatusEnum.enumValues).optional(),
        search: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, status, search, categoryId } = input;
      const conditions = [eq(pages.siteId, context.siteId)];
      if (status) conditions.push(eq(pages.status, status));
      if (search) conditions.push(ilike(pages.title, `%${search}%`));
      if (categoryId) conditions.push(eq(pages.categoryId, categoryId));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.pages.findMany({
          where,
          columns: { contentBlocks: false },
          with: { category: { columns: { id: true, title: true } } },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (n, { desc }) => [desc(n.createdAt)],
        }),
        db.select({ total: count() }).from(pages).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.pages.findFirst({
        where: and(eq(pages.id, input.id), eq(pages.siteId, context.siteId)),
        with: { category: { columns: { id: true, title: true } } },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        status: z.enum(pageStatusEnum.enumValues).default("draft"),
        contentBlocks: contentBlocksSchema.default([]),
        categoryId: z.string().nullable().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        ogImage: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(pages)
        .values({
          siteId: context.siteId,
          title: input.title,
          slug: input.slug,
          status: input.status,
          contentBlocks: input.contentBlocks,
          categoryId: input.categoryId ?? null,
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          ogImage: input.ogImage ?? null,
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
        status: z.enum(pageStatusEnum.enumValues).optional(),
        contentBlocks: contentBlocksSchema.optional(),
        categoryId: z.string().nullable().optional(),
        metaTitle: z.string().nullable().optional(),
        metaDescription: z.string().nullable().optional(),
        ogImage: z.string().nullable().optional(),
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

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.pages.findFirst({
          where: and(eq(pages.id, id), eq(pages.siteId, context.siteId)),
        });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "Page not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(pages)
        .set(updates)
        .where(and(eq(pages.id, id), eq(pages.siteId, context.siteId)))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(pages)
        .where(and(eq(pages.id, input.id), eq(pages.siteId, context.siteId)))
        .returning({ id: pages.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return { success: true };
    }),
};

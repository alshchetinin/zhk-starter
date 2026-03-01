import { z } from "zod";
import { db } from "@zhk/db";
import { pages, pageStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";

export const pagesRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(pageStatusEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [];
      if (status) conditions.push(eq(pages.status, status));
      if (search) conditions.push(ilike(pages.title, `%${search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.pages.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (n, { desc }) => [desc(n.createdAt)],
        }),
        db.select({ total: count() }).from(pages).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.pages.findFirst({
        where: eq(pages.id, input.id),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        status: z.enum(pageStatusEnum.enumValues).default("draft"),
        contentBlocks: contentBlocksSchema.default([]),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        ogImage: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(pages)
        .values({
          title: input.title,
          slug: input.slug,
          status: input.status,
          contentBlocks: input.contentBlocks,
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          ogImage: input.ogImage ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        status: z.enum(pageStatusEnum.enumValues).optional(),
        contentBlocks: contentBlocksSchema.optional(),
        metaTitle: z.string().nullable().optional(),
        metaDescription: z.string().nullable().optional(),
        ogImage: z.string().nullable().optional(),
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
        const existing = await db.query.pages.findFirst({
          where: eq(pages.id, id),
        });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "Page not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(pages)
        .set(updates)
        .where(eq(pages.id, id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(pages)
        .where(eq(pages.id, input.id))
        .returning({ id: pages.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }
      return { success: true };
    }),
};

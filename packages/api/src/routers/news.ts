import { z } from "zod";
import { db } from "@zhk/db";
import { news, newsStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";
import { breadcrumbsConfigSchema } from "../shared/breadcrumbs";

export const newsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        status: z.enum(newsStatusEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [eq(news.siteId, context.siteId)];
      if (status) conditions.push(eq(news.status, status));
      if (search) conditions.push(ilike(news.title, `%${search}%`));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.news.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (n, { desc }) => [desc(n.createdAt)],
        }),
        db.select({ total: count() }).from(news).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.news.findFirst({
        where: and(eq(news.id, input.id), eq(news.siteId, context.siteId)),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "News not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        excerpt: z.string().optional(),
        coverImage: z.string().optional(),
        status: z.enum(newsStatusEnum.enumValues).default("draft"),
        publishedAt: z.string().datetime().optional(),
        contentBlocks: contentBlocksSchema.default([]),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        ogImage: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(news)
        .values({
          siteId: context.siteId,
          title: input.title,
          slug: input.slug,
          excerpt: input.excerpt ?? null,
          coverImage: input.coverImage ?? null,
          status: input.status,
          publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
          contentBlocks: input.contentBlocks,
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
        excerpt: z.string().nullable().optional(),
        coverImage: z.string().nullable().optional(),
        status: z.enum(newsStatusEnum.enumValues).optional(),
        publishedAt: z.string().datetime().nullable().optional(),
        contentBlocks: contentBlocksSchema.optional(),
        metaTitle: z.string().nullable().optional(),
        metaDescription: z.string().nullable().optional(),
        ogImage: z.string().nullable().optional(),
        breadcrumbs: breadcrumbsConfigSchema.optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          if (key === "publishedAt" && value !== null) {
            updates[key] = new Date(value as string);
          } else {
            updates[key] = value;
          }
        }
      }

      const scope = and(eq(news.id, id), eq(news.siteId, context.siteId));

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.news.findFirst({ where: scope });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "News not found" });
        }
        return existing;
      }

      const [updated] = await db.update(news).set(updates).where(scope).returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "News not found" });
      }
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(news)
        .where(and(eq(news.id, input.id), eq(news.siteId, context.siteId)))
        .returning({ id: news.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "News not found" });
      }
      return { success: true };
    }),
};

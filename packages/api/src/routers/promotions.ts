import { z } from "zod";
import { db } from "@zhk/db";
import { promotions, promotionStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { contentBlocksSchema } from "../shared/blocks";

export const promotionsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        status: z.enum(promotionStatusEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [eq(promotions.siteId, context.siteId)];
      if (status) conditions.push(eq(promotions.status, status));
      if (search) conditions.push(ilike(promotions.name, `%${search}%`));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.promotions.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (n, { desc }) => [desc(n.createdAt)],
        }),
        db.select({ total: count() }).from(promotions).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.promotions.findFirst({
        where: and(eq(promotions.id, input.id), eq(promotions.siteId, context.siteId)),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Promotion not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        status: z.enum(promotionStatusEnum.enumValues).default("draft"),
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
        contentBlocks: contentBlocksSchema.default([]),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        ogImage: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(promotions)
        .values({
          siteId: context.siteId,
          name: input.name,
          slug: input.slug ?? null,
          description: input.description ?? null,
          coverImage: input.coverImage ?? null,
          status: input.status,
          dateStart: input.dateStart ?? null,
          dateEnd: input.dateEnd ?? null,
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
        name: z.string().min(1).optional(),
        slug: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        coverImage: z.string().nullable().optional(),
        status: z.enum(promotionStatusEnum.enumValues).optional(),
        dateStart: z.string().nullable().optional(),
        dateEnd: z.string().nullable().optional(),
        contentBlocks: contentBlocksSchema.optional(),
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

      const scope = and(eq(promotions.id, id), eq(promotions.siteId, context.siteId));

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.promotions.findFirst({ where: scope });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "Promotion not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(promotions)
        .set(updates)
        .where(scope)
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Promotion not found" });
      }
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(promotions)
        .where(and(eq(promotions.id, input.id), eq(promotions.siteId, context.siteId)))
        .returning({ id: promotions.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Promotion not found" });
      }
      return { success: true };
    }),
};

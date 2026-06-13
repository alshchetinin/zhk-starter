import { z } from "zod";
import { db } from "@zhk/db";
import { pageCategories, pages } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";

export const pageCategoriesRouter = {
  list: siteProcedure.handler(async ({ context }) => {
    const cats = await db.query.pageCategories.findMany({
      where: eq(pageCategories.siteId, context.siteId),
      orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.title)],
    });
    const counts = await db
      .select({ categoryId: pages.categoryId, c: count() })
      .from(pages)
      .where(eq(pages.siteId, context.siteId))
      .groupBy(pages.categoryId);
    const countMap = new Map(counts.map((r) => [r.categoryId, Number(r.c)]));
    return cats.map((c) => ({ ...c, pageCount: countMap.get(c.id) ?? 0 }));
  }),

  create: siteProcedure
    .input(z.object({ title: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const countResult = await db
        .select({ total: count() })
        .from(pageCategories)
        .where(eq(pageCategories.siteId, context.siteId));
      const total = countResult[0]?.total ?? 0;
      const [created] = await db
        .insert(pageCategories)
        .values({
          siteId: context.siteId,
          title: input.title,
          sortOrder: total,
        })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const [updated] = await db
        .update(pageCategories)
        .set({ title: input.title })
        .where(
          and(
            eq(pageCategories.id, input.id),
            eq(pageCategories.siteId, context.siteId),
          ),
        )
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Категория не найдена" });
      }
      return updated;
    }),

  reorder: siteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      await Promise.all(
        input.ids.map((id, i) =>
          db
            .update(pageCategories)
            .set({ sortOrder: i })
            .where(
              and(
                eq(pageCategories.id, id),
                eq(pageCategories.siteId, context.siteId),
              ),
            ),
        ),
      );
      return { success: true };
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(pageCategories)
        .where(
          and(
            eq(pageCategories.id, input.id),
            eq(pageCategories.siteId, context.siteId),
          ),
        )
        .returning({ id: pageCategories.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Категория не найдена" });
      }
      return { success: true };
    }),
};

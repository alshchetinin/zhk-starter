import { z } from "zod";
import { db } from "@zhk/db";
import { pages } from "@zhk/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicReadProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";

export const publicPagesRouter = {
  list: publicReadProcedure
    .input(paginationInput)
    .handler(async ({ input, context }) => {
      const { page, pageSize } = input;
      const where = and(
        eq(pages.siteId, context.siteId),
        eq(pages.status, "published"),
      );

      const [data, countResult] = await Promise.all([
        db.query.pages.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(pages).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getBySlug: publicReadProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.pages.findFirst({
        where: and(
          eq(pages.siteId, context.siteId),
          eq(pages.slug, input.slug),
          eq(pages.status, "published"),
        ),
        with: { category: { columns: { title: true } } },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }

      const contentBlocks = await enrichContentBlocks(item.contentBlocks);

      return { ...item, contentBlocks };
    }),
};

import { z } from "zod";
import { db } from "@zhk/db";
import { news } from "@zhk/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";

export const publicNewsRouter = {
  list: publicProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const { page, pageSize } = input;
      const where = eq(news.status, "published");

      const [data, countResult] = await Promise.all([
        db.query.news.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (n, { desc }) => [desc(n.publishedAt), desc(n.createdAt)],
        }),
        db.select({ total: count() }).from(news).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.news.findFirst({
        where: and(eq(news.slug, input.slug), eq(news.status, "published")),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "News not found" });
      }
      const contentBlocks = await enrichContentBlocks(item.contentBlocks);
      return { ...item, contentBlocks };
    }),
};

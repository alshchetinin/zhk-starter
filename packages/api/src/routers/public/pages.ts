import { z } from "zod";
import { db } from "@zhk/db";
import { pages } from "@zhk/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";

export const publicPagesRouter = {
  list: publicProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const { page, pageSize } = input;
      const where = eq(pages.status, "published");

      const [data, countResult] = await Promise.all([
        db.query.pages.findMany({
          where,
          columns: { contentBlocks: false },
          with: { project: { columns: { id: true, name: true } } },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(pages).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.pages.findFirst({
        where: and(eq(pages.slug, input.slug), eq(pages.status, "published")),
        with: { project: { columns: { id: true, name: true } } },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Page not found" });
      }

      const contentBlocks = await enrichContentBlocks(item.contentBlocks);

      return { ...item, contentBlocks };
    }),
};

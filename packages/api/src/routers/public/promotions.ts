import { z } from "zod";
import { db } from "@zhk/db";
import { promotions } from "@zhk/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";

export const publicPromotionsRouter = {
  list: publicProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const { page, pageSize } = input;
      const where = eq(promotions.status, "published");

      const [data, countResult] = await Promise.all([
        db.query.promotions.findMany({
          where,
          columns: { contentBlocks: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(promotions).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.promotions.findFirst({
        where: and(eq(promotions.slug, input.slug), eq(promotions.status, "published")),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Promotion not found" });
      }
      const contentBlocks = await enrichContentBlocks(item.contentBlocks);
      return { ...item, contentBlocks };
    }),
};

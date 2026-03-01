import { z } from "zod";
import { db } from "@zhk/db";
import { documents } from "@zhk/db/schema";
import { and, eq, count } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";

export const publicDocumentsRouter = {
  list: publicProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const { page, pageSize } = input;
      const where = eq(documents.status, "published");

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

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.documents.findFirst({
        where: and(eq(documents.slug, input.slug), eq(documents.status, "published")),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }
      const contentBlocks = await enrichContentBlocks(item.contentBlocks);
      return { ...item, contentBlocks };
    }),
};

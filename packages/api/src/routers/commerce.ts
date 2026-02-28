import { z } from "zod";
import { db } from "@zhk/db";
import { commerce } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const commerceRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        projectId: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, projectId, category } = input;
      const conditions = [];
      if (projectId) conditions.push(eq(commerce.projectId, projectId));
      if (category) conditions.push(eq(commerce.category, category));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.commerce.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true, building: true },
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        }),
        db.select({ total: count() }).from(commerce).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.commerce.findFirst({
        where: eq(commerce.id, input.id),
        with: { project: true, building: true },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Commerce space not found" });
      }
      return item;
    }),
};

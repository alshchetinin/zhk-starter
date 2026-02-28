import { z } from "zod";
import { db } from "@zhk/db";
import { buildings } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const buildingsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        projectId: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, projectId } = input;
      const conditions = [];
      if (projectId) conditions.push(eq(buildings.projectId, projectId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.buildings.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true },
          orderBy: (b, { desc }) => [desc(b.createdAt)],
        }),
        db.select({ total: count() }).from(buildings).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const building = await db.query.buildings.findFirst({
        where: eq(buildings.id, input.id),
        with: { project: true, sections: true },
      });
      if (!building) {
        throw new ORPCError("NOT_FOUND", { message: "Building not found" });
      }
      return building;
    }),
};

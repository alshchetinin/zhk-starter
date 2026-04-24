import { z } from "zod";
import { db } from "@zhk/db";
import { parking } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const parkingRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        projectId: z.string().optional(),
        buildingId: z.string().optional(),
        floorId: z.string().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, projectId, buildingId, floorId, isPublished } =
        input;
      const conditions = [];
      if (projectId) conditions.push(eq(parking.projectId, projectId));
      if (buildingId) conditions.push(eq(parking.buildingId, buildingId));
      if (floorId) conditions.push(eq(parking.floorId, floorId));
      if (isPublished !== undefined)
        conditions.push(eq(parking.isPublished, isPublished));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.parking.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true, building: true, floor: true },
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(parking).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.parking.findFirst({
        where: eq(parking.id, input.id),
        with: { project: true, building: true, floor: true },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Parking not found" });
      }
      return item;
    }),
};

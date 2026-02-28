import { z } from "zod";
import { db } from "@zhk/db";
import { apartmentLayouts, apartments } from "@zhk/db/schema";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const apartmentLayoutsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        roomsCount: z.number().int().optional(),
        projectId: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, roomsCount, projectId } = input;
      const conditions = [];
      if (roomsCount) conditions.push(eq(apartmentLayouts.roomsCount, roomsCount));
      if (projectId) {
        const layoutIds = db
          .selectDistinct({ id: apartments.apartmentLayoutId })
          .from(apartments)
          .where(and(eq(apartments.projectId, projectId), isNotNull(apartments.apartmentLayoutId)));
        conditions.push(inArray(apartmentLayouts.id, layoutIds));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.apartmentLayouts.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { tags: { with: { tag: true } } },
          orderBy: (l, { desc }) => [desc(l.createdAt)],
        }),
        db.select({ total: count() }).from(apartmentLayouts).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const layout = await db.query.apartmentLayouts.findFirst({
        where: eq(apartmentLayouts.id, input.id),
        with: { tags: { with: { tag: true } } },
      });
      if (!layout) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment layout not found" });
      }
      return layout;
    }),

  updateSunPosition: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        sunPosition: z.number().int().min(0).max(360),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.apartmentLayouts.findFirst({
        where: eq(apartmentLayouts.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment layout not found" });
      }

      const [updated] = await db
        .update(apartmentLayouts)
        .set({ sunPosition: input.sunPosition })
        .where(eq(apartmentLayouts.id, input.id))
        .returning();

      return updated;
    }),
};

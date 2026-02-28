import { z } from "zod";
import { db } from "@zhk/db";
import { apartments } from "@zhk/db/schema";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const apartmentsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        projectId: z.string().optional(),
        buildingId: z.string().optional(),
        sectionId: z.string().optional(),
        status: z
          .enum(["free", "paid_reservation", "corporate_reservation", "sold"])
          .optional(),
        roomsCount: z.number().int().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, projectId, buildingId, sectionId, status, roomsCount, priceMin, priceMax } =
        input;
      const conditions = [];
      if (projectId) conditions.push(eq(apartments.projectId, projectId));
      if (buildingId) conditions.push(eq(apartments.buildingId, buildingId));
      if (sectionId) conditions.push(eq(apartments.sectionId, sectionId));
      if (status) conditions.push(eq(apartments.status, status));
      if (roomsCount) conditions.push(eq(apartments.roomsCount, roomsCount));
      if (priceMin) conditions.push(gte(apartments.price, String(priceMin)));
      if (priceMax) conditions.push(lte(apartments.price, String(priceMax)));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.apartments.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true, building: true, apartmentLayout: true },
          orderBy: (a, { desc }) => [desc(a.createdAt)],
        }),
        db.select({ total: count() }).from(apartments).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  listByBuilding: protectedProcedure
    .input(z.object({ buildingId: z.string() }))
    .handler(async ({ input }) => {
      return db.query.apartments.findMany({
        where: eq(apartments.buildingId, input.buildingId),
        orderBy: [asc(apartments.floorNumber), asc(apartments.apartmentNumber)],
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const apartment = await db.query.apartments.findFirst({
        where: eq(apartments.id, input.id),
        with: {
          project: true,
          building: true,
          apartmentLayout: true,
          decoration: true,
          promotions: { with: { promotion: true } },
        },
      });
      if (!apartment) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment not found" });
      }
      return apartment;
    }),
};

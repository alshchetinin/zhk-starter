import { z } from "zod";
import { db } from "@zhk/db";
import { apartments, apartmentTags, tickets } from "@zhk/db/schema";
import { and, asc, count, eq, gte, lte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

const apartmentStatusEnum = z.enum([
  "free",
  "paid_reservation",
  "corporate_reservation",
  "sold",
]);

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
          with: {
            project: true,
            building: true,
            apartmentLayout: true,
            apartmentTags: { with: { tag: true } },
          },
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

  listByLayout: protectedProcedure
    .input(z.object({ layoutId: z.string() }))
    .handler(async ({ input }) => {
      return db.query.apartments.findMany({
        where: eq(apartments.apartmentLayoutId, input.layoutId),
        with: { building: true },
        orderBy: [asc(apartments.floorNumber), asc(apartments.apartmentNumber)],
      });
    }),

  listByFloor: protectedProcedure
    .input(z.object({ floorId: z.string() }))
    .handler(async ({ input }) => {
      return db.query.apartments.findMany({
        where: eq(apartments.floorId, input.floorId),
        columns: { id: true, apartmentNumber: true, status: true },
        orderBy: [asc(apartments.apartmentNumber)],
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
          floor: true,
          section: { columns: { id: true, name: true, sunPosition: true } },
          promotions: { with: { promotion: true } },
          apartmentTags: { with: { tag: true } },
        },
      });
      if (!apartment) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment not found" });
      }
      return apartment;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        apartmentNumber: z.string().min(1),
        area: z.number().positive(),
        price: z.number().nonnegative(),
        floorNumber: z.number().int(),
        roomsCount: z.number().int().min(0),
        status: apartmentStatusEnum.default("free"),
        isPublished: z.boolean().optional(),
        projectId: z.string(),
        buildingId: z.string().nullable().optional(),
        sectionId: z.string().nullable().optional(),
        floorId: z.string().nullable().optional(),
        apartmentLayoutId: z.string().nullable().optional(),
        threeDTourUrl: z.string().url().nullable().optional(),
        tagIds: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(apartments)
        .values({
          name: input.name,
          apartmentNumber: input.apartmentNumber,
          area: String(input.area),
          price: String(input.price),
          floorNumber: input.floorNumber,
          roomsCount: input.roomsCount,
          status: input.status,
          isPublished: input.isPublished ?? true,
          projectId: input.projectId,
          buildingId: input.buildingId ?? null,
          sectionId: input.sectionId ?? null,
          floorId: input.floorId ?? null,
          apartmentLayoutId: input.apartmentLayoutId ?? null,
          threeDTourUrl: input.threeDTourUrl ?? null,
        })
        .returning();
      if (input.tagIds && input.tagIds.length > 0 && created) {
        await db
          .insert(apartmentTags)
          .values(
            input.tagIds.map((tagId) => ({ apartmentId: created.id, tagId })),
          )
          .onConflictDoNothing();
      }
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        apartmentNumber: z.string().min(1).optional(),
        area: z.number().positive().optional(),
        price: z.number().nonnegative().optional(),
        floorNumber: z.number().int().optional(),
        roomsCount: z.number().int().min(0).optional(),
        status: apartmentStatusEnum.optional(),
        isPublished: z.boolean().optional(),
        buildingId: z.string().nullable().optional(),
        sectionId: z.string().nullable().optional(),
        floorId: z.string().nullable().optional(),
        apartmentLayoutId: z.string().nullable().optional(),
        threeDTourUrl: z.string().url().nullable().optional(),
        sunPosition: z.number().int().min(0).max(360).nullable().optional(),
        tagIds: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.apartments.findFirst({
        where: eq(apartments.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment not found" });
      }

      const { id, tagIds, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        if (key === "area" || key === "price") {
          updates[key] = value == null ? value : String(value);
        } else {
          updates[key] = value;
        }
      }

      if (tagIds !== undefined) {
        await db.transaction(async (tx) => {
          await tx
            .delete(apartmentTags)
            .where(eq(apartmentTags.apartmentId, input.id));
          if (tagIds.length > 0) {
            await tx
              .insert(apartmentTags)
              .values(tagIds.map((tagId) => ({ apartmentId: input.id, tagId })))
              .onConflictDoNothing();
          }
        });
      }

      if (Object.keys(updates).length === 0) return existing;

      const [updated] = await db
        .update(apartments)
        .set(updates)
        .where(eq(apartments.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.apartments.findFirst({
        where: eq(apartments.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment not found" });
      }

      await db
        .update(tickets)
        .set({ apartmentId: null })
        .where(eq(tickets.apartmentId, input.id));
      await db.delete(apartments).where(eq(apartments.id, input.id));

      return { success: true };
    }),
};

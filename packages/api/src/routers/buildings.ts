import { z } from "zod";
import { db } from "@zhk/db";
import {
  apartments,
  buildings,
  commerce,
  entrances,
  floorLayouts,
  floors,
  nonResidentialFloors,
  parking,
  sections,
  storage,
  tickets,
} from "@zhk/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

const buildingFields = {
  name: z.string().min(1),
  projectId: z.string(),
  completionDate: z.string().nullable().optional(),
  cameraUrl: z.string().url().nullable().optional(),
  masterplanImage: z.string().nullable().optional(),
  masterplanScheme: z.string().nullable().optional(),
  renovationCost: z.number().int().nullable().optional(),
};

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

  create: protectedProcedure
    .input(z.object(buildingFields))
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(buildings)
        .values({
          name: input.name,
          projectId: input.projectId,
          completionDate: input.completionDate ?? null,
          cameraUrl: input.cameraUrl ?? null,
          masterplanImage: input.masterplanImage ?? null,
          masterplanScheme: input.masterplanScheme ?? null,
          renovationCost: input.renovationCost ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        completionDate: z.string().nullable().optional(),
        cameraUrl: z.string().url().nullable().optional(),
        masterplanImage: z.string().nullable().optional(),
        masterplanScheme: z.string().nullable().optional(),
        renovationCost: z.number().int().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.buildings.findFirst({
        where: eq(buildings.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Building not found" });
      }

      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }

      if (Object.keys(updates).length === 0) return existing;

      const [updated] = await db
        .update(buildings)
        .set(updates)
        .where(eq(buildings.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.buildings.findFirst({
        where: eq(buildings.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Building not found" });
      }

      await db.transaction(async (tx) => {
        const sectionRows = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(eq(sections.buildingId, input.id));
        const sectionIds = sectionRows.map((s) => s.id);

        const floorIds = sectionIds.length
          ? (
              await tx
                .select({ id: floors.id })
                .from(floors)
                .where(inArray(floors.sectionId, sectionIds))
            ).map((r) => r.id)
          : [];

        const entranceIds = (
          await tx
            .select({ id: entrances.id })
            .from(entrances)
            .where(eq(entrances.buildingId, input.id))
        ).map((r) => r.id);

        const apartmentIds = (
          await tx
            .select({ id: apartments.id })
            .from(apartments)
            .where(eq(apartments.buildingId, input.id))
        ).map((r) => r.id);

        if (apartmentIds.length) {
          await tx
            .update(tickets)
            .set({ apartmentId: null })
            .where(inArray(tickets.apartmentId, apartmentIds));
          await tx
            .delete(apartments)
            .where(inArray(apartments.id, apartmentIds));
        }

        await tx.delete(commerce).where(eq(commerce.buildingId, input.id));
        await tx.delete(parking).where(eq(parking.buildingId, input.id));
        await tx.delete(storage).where(eq(storage.buildingId, input.id));
        await tx
          .delete(nonResidentialFloors)
          .where(eq(nonResidentialFloors.buildingId, input.id));

        if (sectionIds.length) {
          await tx
            .delete(floorLayouts)
            .where(inArray(floorLayouts.sectionId, sectionIds));
        }
        if (floorIds.length) {
          await tx.delete(floors).where(inArray(floors.id, floorIds));
        }
        if (entranceIds.length) {
          await tx
            .delete(entrances)
            .where(inArray(entrances.id, entranceIds));
        }
        if (sectionIds.length) {
          await tx.delete(sections).where(inArray(sections.id, sectionIds));
        }

        await tx.delete(buildings).where(eq(buildings.id, input.id));
      });

      return { success: true };
    }),
};

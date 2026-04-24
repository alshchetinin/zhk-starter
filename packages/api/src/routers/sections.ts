import { z } from "zod";
import { db } from "@zhk/db";
import {
  apartmentLayouts,
  apartments,
  entrances,
  floorLayouts,
  floors,
  sections,
  tickets,
} from "@zhk/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const sectionsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        buildingId: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, buildingId } = input;
      const conditions = [];
      if (buildingId) conditions.push(eq(sections.buildingId, buildingId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.sections.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { building: true },
          orderBy: (s, { asc }) => [asc(s.name)],
        }),
        db.select({ total: count() }).from(sections).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const section = await db.query.sections.findFirst({
        where: eq(sections.id, input.id),
        with: { building: true, floors: true, entrances: true },
      });
      if (!section) {
        throw new ORPCError("NOT_FOUND", { message: "Section not found" });
      }
      return section;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        buildingId: z.string(),
        floorsCount: z.number().int().nullable().optional(),
        masterplanImage: z.string().nullable().optional(),
        masterplanScheme: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(sections)
        .values({
          name: input.name,
          buildingId: input.buildingId,
          floorsCount: input.floorsCount ?? null,
          masterplanImage: input.masterplanImage ?? null,
          masterplanScheme: input.masterplanScheme ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        floorsCount: z.number().int().nullable().optional(),
        masterplanImage: z.string().nullable().optional(),
        masterplanScheme: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.sections.findFirst({
        where: eq(sections.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Section not found" });
      }

      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) updates[key] = value;
      }
      if (Object.keys(updates).length === 0) return existing;

      const [updated] = await db
        .update(sections)
        .set(updates)
        .where(eq(sections.id, input.id))
        .returning();
      return updated;
    }),

  createStructure: protectedProcedure
    .input(
      z.object({
        buildingId: z.string(),
        sectionId: z.string().nullable().optional(),
        sectionName: z.string().min(1).optional(),
        stacks: z
          .array(
            z.object({
              startFloor: z.number().int(),
              endFloor: z.number().int(),
              apartments: z
                .array(
                  z.object({
                    number: z.number().int().min(1),
                    roomsCount: z.number().int().min(0),
                    area: z.number().positive(),
                    customNumbers: z.record(z.string(), z.string()).optional(),
                  }),
                )
                .min(1),
            }),
          )
          .min(1),
      }),
    )
    .handler(async ({ input }) => {
      if (!input.sectionId && !input.sectionName) {
        throw new ORPCError("BAD_REQUEST", {
          message: "sectionId or sectionName required",
        });
      }

      const result = await db.transaction(async (tx) => {
        // 1. Section — use existing or create
        let sectionId = input.sectionId;
        if (!sectionId) {
          const maxEnd = Math.max(...input.stacks.map((s) => s.endFloor));
          const [created] = await tx
            .insert(sections)
            .values({
              name: input.sectionName!,
              buildingId: input.buildingId,
              floorsCount: maxEnd,
            })
            .returning();
          sectionId = created.id;
        }

        // 2. Dedupe layouts across all stacks
        const layoutKey = (rooms: number, area: number) =>
          `${rooms}-${area}`;
        const layoutName = (rooms: number, area: number) =>
          rooms === 0 ? `Студия ${area}м²` : `${rooms}к ${area}м²`;

        const uniqueLayouts = new Map<
          string,
          { roomsCount: number; area: number }
        >();
        for (const stack of input.stacks) {
          for (const apt of stack.apartments) {
            uniqueLayouts.set(layoutKey(apt.roomsCount, apt.area), {
              roomsCount: apt.roomsCount,
              area: apt.area,
            });
          }
        }

        const layoutIdByKey = new Map<string, string>();
        if (uniqueLayouts.size > 0) {
          const inserted = await tx
            .insert(apartmentLayouts)
            .values(
              [...uniqueLayouts.values()].map((l) => ({
                name: layoutName(l.roomsCount, l.area),
                roomsCount: l.roomsCount,
                area: String(l.area),
              })),
            )
            .returning();
          // Map by key in insertion order
          const values = [...uniqueLayouts.entries()];
          for (let i = 0; i < inserted.length; i++) {
            layoutIdByKey.set(values[i]![0], inserted[i]!.id);
          }
        }

        // 3. For each stack: expand floors, create floor rows and apartments
        let totalApartments = 0;
        let totalFloors = 0;

        for (const stack of input.stacks) {
          const lo = Math.min(stack.startFloor, stack.endFloor);
          const hi = Math.max(stack.startFloor, stack.endFloor);
          const floorNumbers: number[] = [];
          for (let f = lo; f <= hi; f++) floorNumbers.push(f);

          const floorRows = await tx
            .insert(floors)
            .values(
              floorNumbers.map((n) => ({
                sectionId: sectionId!,
                floorNumber: n,
              })),
            )
            .returning({ id: floors.id, floorNumber: floors.floorNumber });
          totalFloors += floorRows.length;

          const aptValues: (typeof apartments.$inferInsert)[] = [];
          for (const fr of floorRows) {
            for (const apt of stack.apartments) {
              const key = `${fr.floorNumber}`;
              const customNumber = apt.customNumbers?.[key];
              const autoNumber = `${fr.floorNumber! * 100 + apt.number}`;
              const number = customNumber?.trim() || autoNumber;
              aptValues.push({
                name: `Квартира ${number}`,
                apartmentNumber: number,
                area: String(apt.area),
                price: "0",
                floorNumber: fr.floorNumber!,
                roomsCount: apt.roomsCount,
                status: "free",
                isPublished: true,
                sectionId: sectionId!,
                buildingId: input.buildingId,
                floorId: fr.id,
                apartmentLayoutId: layoutIdByKey.get(
                  layoutKey(apt.roomsCount, apt.area),
                )!,
              });
            }
          }

          if (aptValues.length) {
            await tx.insert(apartments).values(aptValues);
            totalApartments += aptValues.length;
          }
        }

        return { sectionId, totalApartments, totalFloors };
      });

      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.sections.findFirst({
        where: eq(sections.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Section not found" });
      }

      await db.transaction(async (tx) => {
        const floorIds = (
          await tx
            .select({ id: floors.id })
            .from(floors)
            .where(eq(floors.sectionId, input.id))
        ).map((r) => r.id);

        const apartmentIds = (
          await tx
            .select({ id: apartments.id })
            .from(apartments)
            .where(eq(apartments.sectionId, input.id))
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

        await tx
          .delete(floorLayouts)
          .where(eq(floorLayouts.sectionId, input.id));

        if (floorIds.length) {
          await tx.delete(floors).where(inArray(floors.id, floorIds));
        }

        await tx.delete(entrances).where(eq(entrances.sectionId, input.id));
        await tx.delete(sections).where(eq(sections.id, input.id));
      });

      return { success: true };
    }),
};

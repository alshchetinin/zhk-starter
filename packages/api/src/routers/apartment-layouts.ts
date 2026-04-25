import { z } from "zod";
import { db } from "@zhk/db";
import { apartmentLayouts, apartments } from "@zhk/db/schema";
import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

const galleryItemSchema = z.object({
  url: z.string().min(1),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

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
        with: { tags: { with: { tag: true } }, integration: true },
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

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        area: z.number().positive(),
        roomsCount: z.number().int().min(0),
        floorRange: z.string().nullable().optional(),
        priceRange: z.string().nullable().optional(),
        defaultLayoutImage: z.string().nullable().optional(),
        furnishedLayoutImage: z.string().nullable().optional(),
        threeDLayoutImage: z.string().nullable().optional(),
        threeDTourUrl: z.string().nullable().optional(),
        sunPosition: z.number().int().min(0).max(360).nullable().optional(),
        ceilingHeight: z.number().positive().nullable().optional(),
        gallery: z.array(galleryItemSchema).max(50).nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(apartmentLayouts)
        .values({
          name: input.name,
          area: String(input.area),
          roomsCount: input.roomsCount,
          floorRange: input.floorRange ?? null,
          priceRange: input.priceRange ?? null,
          defaultLayoutImage: input.defaultLayoutImage ?? null,
          furnishedLayoutImage: input.furnishedLayoutImage ?? null,
          threeDLayoutImage: input.threeDLayoutImage ?? null,
          threeDTourUrl: input.threeDTourUrl ?? null,
          sunPosition: input.sunPosition ?? null,
          ceilingHeight:
            input.ceilingHeight != null ? String(input.ceilingHeight) : null,
          gallery: input.gallery ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        area: z.number().positive().optional(),
        roomsCount: z.number().int().min(0).optional(),
        floorRange: z.string().nullable().optional(),
        priceRange: z.string().nullable().optional(),
        defaultLayoutImage: z.string().nullable().optional(),
        furnishedLayoutImage: z.string().nullable().optional(),
        threeDLayoutImage: z.string().nullable().optional(),
        threeDTourUrl: z.string().nullable().optional(),
        sunPosition: z.number().int().min(0).max(360).nullable().optional(),
        ceilingHeight: z.number().positive().nullable().optional(),
        gallery: z.array(galleryItemSchema).max(50).nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.apartmentLayouts.findFirst({
        where: eq(apartmentLayouts.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment layout not found" });
      }

      const lockedFields =
        existing.integrationId && existing.syncedFields
          ? new Set(existing.syncedFields)
          : null;

      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      const ignored: string[] = [];
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        if (key !== "gallery" && lockedFields?.has(key)) {
          ignored.push(key);
          continue;
        }
        if (key === "area" || key === "ceilingHeight") {
          updates[key] = value == null ? null : String(value);
        } else {
          updates[key] = value;
        }
      }
      if (ignored.length) {
        console.warn(
          `[apartmentLayouts.update] ignored locked fields for layout ${input.id}: ${ignored.join(", ")}`,
        );
      }
      if (Object.keys(updates).length === 0) return existing;

      const [updated] = await db
        .update(apartmentLayouts)
        .set(updates)
        .where(eq(apartmentLayouts.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.apartmentLayouts.findFirst({
        where: eq(apartmentLayouts.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Apartment layout not found" });
      }

      // Detach from apartments first so we don't violate FK
      await db
        .update(apartments)
        .set({ apartmentLayoutId: null })
        .where(eq(apartments.apartmentLayoutId, input.id));

      await db
        .delete(apartmentLayouts)
        .where(eq(apartmentLayouts.id, input.id));

      return { success: true };
    }),
};

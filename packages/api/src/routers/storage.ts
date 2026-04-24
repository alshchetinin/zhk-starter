import { z } from "zod";
import { db } from "@zhk/db";
import { storage } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const storageRouter = {
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
      if (projectId) conditions.push(eq(storage.projectId, projectId));
      if (buildingId) conditions.push(eq(storage.buildingId, buildingId));
      if (floorId) conditions.push(eq(storage.floorId, floorId));
      if (isPublished !== undefined)
        conditions.push(eq(storage.isPublished, isPublished));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.storage.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true, building: true, floor: true },
          orderBy: (s, { desc }) => [desc(s.createdAt)],
        }),
        db.select({ total: count() }).from(storage).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.storage.findFirst({
        where: eq(storage.id, input.id),
        with: { project: true, building: true, floor: true },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Storage not found" });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        area: z.number().positive().nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        floorNumber: z.number().int().nullable().optional(),
        isPublished: z.boolean().optional(),
        projectId: z.string(),
        buildingId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(storage)
        .values({
          name: input.name,
          area: input.area != null ? String(input.area) : null,
          price: input.price != null ? String(input.price) : null,
          floorNumber: input.floorNumber ?? null,
          isPublished: input.isPublished ?? true,
          projectId: input.projectId,
          buildingId: input.buildingId ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        area: z.number().positive().nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        floorNumber: z.number().int().nullable().optional(),
        isPublished: z.boolean().optional(),
        buildingId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.storage.findFirst({
        where: eq(storage.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Storage not found" });
      }
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        if (key === "area" || key === "price") {
          updates[key] = value == null ? null : String(value);
        } else {
          updates[key] = value;
        }
      }
      if (Object.keys(updates).length === 0) return existing;
      const [updated] = await db
        .update(storage)
        .set(updates)
        .where(eq(storage.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.storage.findFirst({
        where: eq(storage.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Storage not found" });
      }
      await db.delete(storage).where(eq(storage.id, input.id));
      return { success: true };
    }),
};

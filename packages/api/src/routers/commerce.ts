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
        buildingId: z.string().optional(),
        floorId: z.string().optional(),
        category: z.string().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const {
        page,
        pageSize,
        projectId,
        buildingId,
        floorId,
        category,
        isPublished,
      } = input;
      const conditions = [];
      if (projectId) conditions.push(eq(commerce.projectId, projectId));
      if (buildingId) conditions.push(eq(commerce.buildingId, buildingId));
      if (floorId) conditions.push(eq(commerce.floorId, floorId));
      if (category) conditions.push(eq(commerce.category, category));
      if (isPublished !== undefined)
        conditions.push(eq(commerce.isPublished, isPublished));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.commerce.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { project: true, building: true, floor: true },
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
        with: { project: true, building: true, floor: true },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Commerce space not found" });
      }
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().nullable().optional(),
        area: z.number().positive().nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        floorNumber: z.number().int().nullable().optional(),
        layoutImage: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
        projectId: z.string(),
        buildingId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(commerce)
        .values({
          name: input.name,
          category: input.category ?? null,
          area: input.area != null ? String(input.area) : null,
          price: input.price != null ? String(input.price) : null,
          floorNumber: input.floorNumber ?? null,
          layoutImage: input.layoutImage ?? null,
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
        category: z.string().nullable().optional(),
        area: z.number().positive().nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        floorNumber: z.number().int().nullable().optional(),
        layoutImage: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
        buildingId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.commerce.findFirst({
        where: eq(commerce.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Commerce not found" });
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
        .update(commerce)
        .set(updates)
        .where(eq(commerce.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.commerce.findFirst({
        where: eq(commerce.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Commerce not found" });
      }
      await db.delete(commerce).where(eq(commerce.id, input.id));
      return { success: true };
    }),
};

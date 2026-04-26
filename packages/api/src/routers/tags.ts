import { z } from "zod";
import { db } from "@zhk/db";
import {
  tags,
  apartmentLayoutTags,
  apartmentTags,
  apartmentLayouts,
  apartments,
} from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

export const tagsRouter = {
  list: protectedProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { page, pageSize, search } = input;
      const where = search ? ilike(tags.name, `%${search}%`) : undefined;

      const [data, countResult] = await Promise.all([
        db.query.tags.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (t, { asc }) => [asc(t.name)],
        }),
        db.select({ total: count() }).from(tags).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const tag = await db.query.tags.findFirst({
        where: eq(tags.id, input.id),
      });
      if (!tag) {
        throw new ORPCError("NOT_FOUND", { message: "Тег не найден" });
      }
      return tag;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const [created] = await db
        .insert(tags)
        .values({
          name: input.name,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
        })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const existing = await db.query.tags.findFirst({
        where: eq(tags.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Тег не найден" });
      }

      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        updates[key] = value;
      }
      if (Object.keys(updates).length === 0) return existing;

      const [updated] = await db
        .update(tags)
        .set(updates)
        .where(eq(tags.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const existing = await db.query.tags.findFirst({
        where: eq(tags.id, input.id),
      });
      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Тег не найден" });
      }
      if (existing.integrationId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Импортированный тег нельзя удалить",
        });
      }

      await db.delete(tags).where(eq(tags.id, input.id));
      return { success: true };
    }),

  setLayoutTags: protectedProcedure
    .input(
      z.object({
        layoutId: z.string(),
        tagIds: z.array(z.string()),
      }),
    )
    .handler(async ({ input }) => {
      const layout = await db.query.apartmentLayouts.findFirst({
        where: eq(apartmentLayouts.id, input.layoutId),
      });
      if (!layout) {
        throw new ORPCError("NOT_FOUND", { message: "Планировка не найдена" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(apartmentLayoutTags)
          .where(
            and(
              eq(apartmentLayoutTags.layoutId, input.layoutId),
              eq(apartmentLayoutTags.isManual, true),
            ),
          );
        if (input.tagIds.length > 0) {
          await tx
            .insert(apartmentLayoutTags)
            .values(
              input.tagIds.map((tagId) => ({
                layoutId: input.layoutId,
                tagId,
                isManual: true,
              })),
            )
            .onConflictDoUpdate({
              target: [
                apartmentLayoutTags.layoutId,
                apartmentLayoutTags.tagId,
              ],
              set: { isManual: true },
            });
        }
      });

      return { success: true };
    }),

  setApartmentTags: protectedProcedure
    .input(
      z.object({
        apartmentId: z.string(),
        tagIds: z.array(z.string()),
      }),
    )
    .handler(async ({ input }) => {
      const apartment = await db.query.apartments.findFirst({
        where: eq(apartments.id, input.apartmentId),
      });
      if (!apartment) {
        throw new ORPCError("NOT_FOUND", { message: "Квартира не найдена" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(apartmentTags)
          .where(eq(apartmentTags.apartmentId, input.apartmentId));
        if (input.tagIds.length > 0) {
          await tx
            .insert(apartmentTags)
            .values(
              input.tagIds.map((tagId) => ({
                apartmentId: input.apartmentId,
                tagId,
              })),
            )
            .onConflictDoNothing();
        }
      });

      return { success: true };
    }),
};

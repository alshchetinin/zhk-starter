import { z } from "zod";
import { db } from "@zhk/db";
import { modals, modalStatusEnum } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { modalFieldsSchema } from "../shared/modal-fields";

export const modalsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        status: z.enum(modalStatusEnum.enumValues).optional(),
        search: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, status, search } = input;
      const conditions = [eq(modals.siteId, context.siteId)];
      if (status) conditions.push(eq(modals.status, status));
      if (search) {
        const escaped = search.replace(/[%_]/g, "\\$&");
        conditions.push(ilike(modals.title, `%${escaped}%`));
      }
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.modals.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (m, { desc }) => [desc(m.createdAt)],
        }),
        db.select({ total: count() }).from(modals).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.modals.findFirst({
        where: and(eq(modals.id, input.id), eq(modals.siteId, context.siteId)),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Modal not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        image: z.string().optional(),
        successMessage: z.string().optional(),
        status: z.enum(modalStatusEnum.enumValues).default("draft"),
        fields: modalFieldsSchema.optional(),
        receiverIds: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [created] = await db
        .insert(modals)
        .values({
          siteId: context.siteId,
          title: input.title,
          slug: input.slug,
          description: input.description ?? null,
          image: input.image ?? null,
          successMessage: input.successMessage ?? null,
          status: input.status,
          fields: input.fields ?? [],
          receiverIds: input.receiverIds ?? [],
        })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
        successMessage: z.string().nullable().optional(),
        status: z.enum(modalStatusEnum.enumValues).optional(),
        fields: modalFieldsSchema.optional(),
        receiverIds: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        const existing = await db.query.modals.findFirst({
          where: and(eq(modals.id, id), eq(modals.siteId, context.siteId)),
        });
        if (!existing) {
          throw new ORPCError("NOT_FOUND", { message: "Modal not found" });
        }
        return existing;
      }

      const [updated] = await db
        .update(modals)
        .set(updates)
        .where(and(eq(modals.id, id), eq(modals.siteId, context.siteId)))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Modal not found" });
      }
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(modals)
        .where(and(eq(modals.id, input.id), eq(modals.siteId, context.siteId)))
        .returning({ id: modals.id });
      if (!deleted.length) {
        throw new ORPCError("NOT_FOUND", { message: "Modal not found" });
      }
      return { success: true };
    }),
};

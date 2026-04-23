import { z } from "zod";
import { db } from "@zhk/db";
import { banks } from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";

const bankInput = z.object({
  name: z.string().min(1),
  logo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  brandColor: z.string().nullable().optional(),
});

export const banksRouter = {
  list: siteProcedure
    .input(paginationInput.extend({ search: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const { page, pageSize, search } = input;
      const conditions = [eq(banks.siteId, context.siteId)];
      if (search) conditions.push(ilike(banks.name, `%${search}%`));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.banks.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (b, { asc }) => [asc(b.name)],
        }),
        db.select({ total: count() }).from(banks).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.banks.findFirst({
        where: and(eq(banks.id, input.id), eq(banks.siteId, context.siteId)),
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Bank not found" });
      }
      return item;
    }),

  create: siteProcedure
    .input(bankInput)
    .handler(async ({ input, context }) => {
      const [item] = await db
        .insert(banks)
        .values({ ...input, siteId: context.siteId })
        .returning();
      return item;
    }),

  update: siteProcedure
    .input(z.object({ id: z.string() }).merge(bankInput.partial()))
    .handler(async ({ input, context }) => {
      const { id, ...data } = input;
      const [item] = await db
        .update(banks)
        .set(data)
        .where(and(eq(banks.id, id), eq(banks.siteId, context.siteId)))
        .returning();
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Bank not found" });
      }
      return item;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [item] = await db
        .delete(banks)
        .where(and(eq(banks.id, input.id), eq(banks.siteId, context.siteId)))
        .returning({ id: banks.id });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Bank not found" });
      }
      return { success: true };
    }),
};

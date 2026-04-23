import { z } from "zod";
import { db } from "@zhk/db";
import {
  purchaseMethods,
  purchaseMethodProjects,
  purchaseMethodKindEnum,
} from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { syncProjectLinks } from "../shared/project-links";

const purchaseMethodDataSchema = z.record(z.string(), z.unknown());

const purchaseMethodInput = z.object({
  kind: z.enum(purchaseMethodKindEnum.enumValues),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  data: purchaseMethodDataSchema.optional(),
  projectIds: z.array(z.string()).optional(),
});

const syncLinks = (id: string, projectIds: string[] | undefined) =>
  syncProjectLinks(
    purchaseMethodProjects,
    purchaseMethodProjects.purchaseMethodId,
    "purchaseMethodId",
    id,
    projectIds,
  );

export const purchaseMethodsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
        kind: z.enum(purchaseMethodKindEnum.enumValues).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, search, kind, isActive } = input;
      const conditions = [eq(purchaseMethods.siteId, context.siteId)];
      if (search) conditions.push(ilike(purchaseMethods.title, `%${search}%`));
      if (kind) conditions.push(eq(purchaseMethods.kind, kind));
      if (isActive !== undefined)
        conditions.push(eq(purchaseMethods.isActive, isActive));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.purchaseMethods.findMany({
          where,
          columns: { data: false },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: {
            methodProjects: {
              with: { project: { columns: { id: true, name: true } } },
            },
          },
          orderBy: (m, { asc, desc }) => [asc(m.sortOrder), desc(m.createdAt)],
        }),
        db.select({ total: count() }).from(purchaseMethods).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.purchaseMethods.findFirst({
        where: and(
          eq(purchaseMethods.id, input.id),
          eq(purchaseMethods.siteId, context.siteId),
        ),
        with: {
          methodProjects: {
            with: { project: { columns: { id: true, name: true } } },
          },
        },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Purchase method not found",
        });
      }
      return item;
    }),

  create: siteProcedure
    .input(purchaseMethodInput)
    .handler(async ({ input, context }) => {
      const { projectIds, ...data } = input;
      const [item] = await db
        .insert(purchaseMethods)
        .values({ ...data, siteId: context.siteId })
        .returning();

      if (projectIds?.length && item) {
        await syncLinks(item.id, projectIds);
      }

      return item;
    }),

  update: siteProcedure
    .input(z.object({ id: z.string() }).merge(purchaseMethodInput.partial()))
    .handler(async ({ input, context }) => {
      const { id, projectIds, ...data } = input;
      const scope = and(
        eq(purchaseMethods.id, id),
        eq(purchaseMethods.siteId, context.siteId),
      );

      const [item] = await db
        .update(purchaseMethods)
        .set(data)
        .where(scope)
        .returning();

      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Purchase method not found",
        });
      }

      if (projectIds !== undefined) {
        await syncLinks(id, projectIds);
      }

      return item;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [item] = await db
        .delete(purchaseMethods)
        .where(
          and(
            eq(purchaseMethods.id, input.id),
            eq(purchaseMethods.siteId, context.siteId),
          ),
        )
        .returning({ id: purchaseMethods.id });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Purchase method not found",
        });
      }
      return { success: true };
    }),
};

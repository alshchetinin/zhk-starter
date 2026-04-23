import { z } from "zod";
import { db } from "@zhk/db";
import {
  mortgagePrograms,
  mortgageProgramProjects,
  mortgageProgramStatusEnum,
} from "@zhk/db/schema";
import { and, count, eq, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { paginationInput, calcOffset } from "../shared/pagination";
import { syncProjectLinks } from "../shared/project-links";

const mortgageProgramInput = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  rate: z.string(),
  maxLoanAmount: z.string().nullable().optional(),
  minDownPaymentPercent: z.string().nullable().optional(),
  termMonths: z.number().int().positive().nullable().optional(),
  bankId: z.string().nullable().optional(),
  status: z.enum(mortgageProgramStatusEnum.enumValues).optional(),
  projectIds: z.array(z.string()).optional(),
});

const syncLinks = (id: string, projectIds: string[] | undefined) =>
  syncProjectLinks(
    mortgageProgramProjects,
    mortgageProgramProjects.mortgageProgramId,
    "mortgageProgramId",
    id,
    projectIds,
  );

export const mortgageProgramsRouter = {
  list: siteProcedure
    .input(
      paginationInput.extend({
        search: z.string().optional(),
        status: z.enum(mortgageProgramStatusEnum.enumValues).optional(),
        bankId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, search, status, bankId } = input;
      const conditions = [eq(mortgagePrograms.siteId, context.siteId)];
      if (search) conditions.push(ilike(mortgagePrograms.name, `%${search}%`));
      if (status) conditions.push(eq(mortgagePrograms.status, status));
      if (bankId) conditions.push(eq(mortgagePrograms.bankId, bankId));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.mortgagePrograms.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: {
            bank: true,
            programProjects: {
              with: { project: { columns: { id: true, name: true } } },
            },
          },
          orderBy: (m, { desc }) => [desc(m.createdAt)],
        }),
        db.select({ total: count() }).from(mortgagePrograms).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.mortgagePrograms.findFirst({
        where: and(
          eq(mortgagePrograms.id, input.id),
          eq(mortgagePrograms.siteId, context.siteId),
        ),
        with: {
          bank: true,
          programProjects: {
            with: { project: { columns: { id: true, name: true } } },
          },
        },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Mortgage program not found",
        });
      }
      return item;
    }),

  create: siteProcedure
    .input(mortgageProgramInput)
    .handler(async ({ input, context }) => {
      const { projectIds, ...data } = input;
      const [item] = await db
        .insert(mortgagePrograms)
        .values({ ...data, siteId: context.siteId })
        .returning();

      if (projectIds?.length && item) {
        await syncLinks(item.id, projectIds);
      }

      return item;
    }),

  update: siteProcedure
    .input(z.object({ id: z.string() }).merge(mortgageProgramInput.partial()))
    .handler(async ({ input, context }) => {
      const { id, projectIds, ...data } = input;
      const scope = and(
        eq(mortgagePrograms.id, id),
        eq(mortgagePrograms.siteId, context.siteId),
      );

      const [item] = await db
        .update(mortgagePrograms)
        .set(data)
        .where(scope)
        .returning();

      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Mortgage program not found",
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
        .delete(mortgagePrograms)
        .where(
          and(
            eq(mortgagePrograms.id, input.id),
            eq(mortgagePrograms.siteId, context.siteId),
          ),
        )
        .returning({ id: mortgagePrograms.id });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Mortgage program not found",
        });
      }
      return { success: true };
    }),
};

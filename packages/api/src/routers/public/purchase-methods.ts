import { z } from "zod";
import { db } from "@zhk/db";
import { purchaseMethods, purchaseMethodProjects } from "@zhk/db/schema";
import { and, count, eq, exists, notExists, or, sql } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";

export const publicPurchaseMethodsRouter = {
  list: publicActiveSiteProcedure
    .input(paginationInput.extend({ projectId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const { page, pageSize, projectId } = input;
      const conditions = [
        eq(purchaseMethods.siteId, context.siteId),
        eq(purchaseMethods.isActive, true),
      ];

      if (projectId) {
        conditions.push(
          or(
            exists(
              db
                .select({ one: sql`1` })
                .from(purchaseMethodProjects)
                .where(
                  and(
                    eq(
                      purchaseMethodProjects.purchaseMethodId,
                      purchaseMethods.id,
                    ),
                    eq(purchaseMethodProjects.projectId, projectId),
                  ),
                ),
            ),
            notExists(
              db
                .select({ one: sql`1` })
                .from(purchaseMethodProjects)
                .where(
                  eq(
                    purchaseMethodProjects.purchaseMethodId,
                    purchaseMethods.id,
                  ),
                ),
            ),
          )!,
        );
      }

      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.purchaseMethods.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (m, { asc, desc }) => [asc(m.sortOrder), desc(m.createdAt)],
        }),
        db.select({ total: count() }).from(purchaseMethods).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),
};

import { z } from "zod";
import { db } from "@zhk/db";
import { mortgagePrograms, mortgageProgramProjects } from "@zhk/db/schema";
import { and, count, eq, exists, notExists, or, sql } from "drizzle-orm";
import { publicReadProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";

export const publicMortgageProgramsRouter = {
  list: publicReadProcedure
    .input(paginationInput.extend({ projectId: z.string().optional() }))
    .handler(async ({ input, context }) => {
      const { page, pageSize, projectId } = input;
      const conditions = [
        eq(mortgagePrograms.siteId, context.siteId),
        eq(mortgagePrograms.status, "active"),
      ];

      // Programs linked to this project OR programs with no project links (available to all)
      if (projectId) {
        conditions.push(
          or(
            exists(
              db
                .select({ one: sql`1` })
                .from(mortgageProgramProjects)
                .where(
                  and(
                    eq(
                      mortgageProgramProjects.mortgageProgramId,
                      mortgagePrograms.id,
                    ),
                    eq(mortgageProgramProjects.projectId, projectId),
                  ),
                ),
            ),
            notExists(
              db
                .select({ one: sql`1` })
                .from(mortgageProgramProjects)
                .where(
                  eq(
                    mortgageProgramProjects.mortgageProgramId,
                    mortgagePrograms.id,
                  ),
                ),
            ),
          )!,
        );
      }

      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.mortgagePrograms.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { bank: true },
          orderBy: (m, { asc }) => [asc(m.rate)],
        }),
        db.select({ total: count() }).from(mortgagePrograms).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),
};

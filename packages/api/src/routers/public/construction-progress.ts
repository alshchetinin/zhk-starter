import { z } from "zod";
import { db } from "@zhk/db";
import { constructionProgress } from "@zhk/db/schema";
import { and, count, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicSiteProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";
import { enrichContentBlocks } from "./utils";
import type { ContentBlock } from "../../shared/blocks";

export const publicConstructionProgressRouter = {
  list: publicSiteProcedure
    .input(
      paginationInput.extend({
        projectId: z.string(),
        buildingId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { page, pageSize, projectId, buildingId } = input;
      const conditions = [
        eq(constructionProgress.siteId, context.siteId),
        eq(constructionProgress.projectId, projectId),
        eq(constructionProgress.status, "published"),
      ];
      if (buildingId)
        conditions.push(eq(constructionProgress.buildingId, buildingId));
      const where = and(...conditions);

      const [data, countResult] = await Promise.all([
        db.query.constructionProgress.findMany({
          where,
          columns: { contentBlocks: false },
          with: { building: { columns: { id: true, name: true } } },
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          orderBy: (cp, { desc: d }) => [d(cp.date)],
        }),
        db
          .select({ total: count() })
          .from(constructionProgress)
          .where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: publicSiteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.constructionProgress.findFirst({
        where: and(
          eq(constructionProgress.siteId, context.siteId),
          eq(constructionProgress.id, input.id),
          eq(constructionProgress.status, "published"),
        ),
        with: { building: { columns: { id: true, name: true } } },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", {
          message: "Construction progress not found",
        });
      }

      const enriched = await enrichContentBlocks(
        (item.contentBlocks ?? []) as ContentBlock[],
      );

      return { ...item, contentBlocks: enriched };
    }),
};
